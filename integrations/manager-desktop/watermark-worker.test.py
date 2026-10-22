"""Deterministic regression tests; no generation, network or model download."""
import importlib.util
import hashlib
import tempfile
import unittest
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

spec=importlib.util.spec_from_file_location('watermark_worker',Path(__file__).with_name('watermark-worker.py'))
worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
cv2.setNumThreads(2)

class WatermarkTests(unittest.TestCase):
    def test_clean_rgba_and_source_hash(self):
        with tempfile.TemporaryDirectory() as folder:
            source=Path(folder)/'source.png';target=Path(folder)/'output.png'
            pixels=np.full((720,1280,4),100,np.uint8);pixels[:,:,3]=140
            Image.fromarray(pixels).save(source);before=source.read_bytes()
            job={'source':str(source),'target':str(target),'sourceSha256':hashlib.sha256(before).hexdigest()}
            result=worker.process(job)
            self.assertEqual(result['maskedPixels'],0)
            np.testing.assert_array_equal(np.asarray(Image.open(target)),pixels)
            self.assertEqual(source.read_bytes(),before)
            with self.assertRaisesRegex(ValueError,'source-changed'):
                worker.process({**job,'sourceSha256':'0'*64})

    def test_native_tiles_have_no_resize_or_mask_seam(self):
        class Model:
            def run(self,_,inputs):
                self.last_shape=inputs['image'].shape
                self.assert_shape=inputs['mask'].shape
                output=inputs['image']*255
                return [np.where(inputs['mask']>0,123,output)]
        old=worker._session;model=Model();worker._session=model
        try:
            rgb=np.full((266,791,3),70,np.uint8)
            mask=np.zeros((266,791),np.uint8);mask[80:180,40:750]=255
            output=worker.restore_texture(rgb,mask)
            self.assertEqual(model.last_shape,(1,3,512,512))
            self.assertEqual(model.assert_shape,(1,1,512,512))
            self.assertEqual(output.shape,rgb.shape)
            self.assertLessEqual(int(np.abs(output[mask>0].astype(int)-123).max()),1)
        finally:worker._session=old

    def test_synthetic_provider_marks_preserve_unmasked_pixels(self):
        with tempfile.TemporaryDirectory() as folder:
            pixels=np.full((720,1280,4),110,np.uint8);pixels[:,:,3]=255
            for name,box in [('ai-badge.png',(10,10,60,52)),('dreamina-logo.png',(944,646,324,61))]:
                x,y,w,h=box;template=cv2.imread(str(worker.TEMPLATES/name),0)
                overlay=cv2.resize(template,(w,h)).astype('float32')/255
                pixels[y:y+h,x:x+w,:3]=(110+overlay[:,:,None]*100).astype('uint8')
            source=Path(folder)/'source.png';target=Path(folder)/'output.png';mask_file=Path(folder)/'mask.png'
            Image.fromarray(pixels).save(source)
            result=worker.process({'source':str(source),'target':str(target),'maskTarget':str(mask_file),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest()})
            self.assertEqual(sum(r['detected'] for r in result['regions']),2)
            output=np.asarray(Image.open(target));mask=np.asarray(Image.open(mask_file))
            np.testing.assert_array_equal(output[mask==0],pixels[mask==0])
            self.assertLess(result['maskedPixels'],720*1280*.03)

    def test_invisible_badge_does_not_trigger_frame_cue(self):
        pixels=np.full((720,1280,4),127,np.uint8);pixels[:,:,3]=0
        reference=cv2.imread(str(worker.TEMPLATES/'ai-badge.png'),0)
        pixels[10:62,10:70,:3]=cv2.resize(reference,(60,52))[:,:,None]
        match=worker.anchored_badge(pixels,.5)
        self.assertLess(match['score'],.08)

    def test_reflected_padding_never_exposes_a_duplicate_mark(self):
        class Model:
            def run(self,_,inputs):
                white=np.all(inputs['image'][0]>.9,axis=0)
                if np.any(white & (inputs['mask'][0,0]==0)):
                    raise AssertionError('reflected watermark leaked into visible model context')
                return [np.where(inputs['mask']>0,123,inputs['image']*255)]
        old=worker._session;worker._session=Model()
        try:
            rgb=np.full((240,260,3),70,np.uint8);mask=np.zeros((240,260),np.uint8)
            mask[20:130,20:140]=255;rgb[mask>0]=255
            result=worker.restore_texture(rgb,mask)
            self.assertLessEqual(int(np.abs(result[mask>0].astype(int)-123).max()),1)
        finally:worker._session=old

if __name__=='__main__':unittest.main()
