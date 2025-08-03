// Test script to verify image upload functionality
const { uploadImageToSupabase, ensureBucketExists } = require('./lib/storage-utils.ts');
const fs = require('fs');
const path = require('path');

async function testImageUpload() {
  console.log('🧪 Testing image upload functionality...');
  
  try {
    // Check if bucket exists
    console.log('1. Checking bucket existence...');
    const bucketReady = await ensureBucketExists();
    console.log('   Bucket ready:', bucketReady);
    
    if (!bucketReady) {
      console.log('❌ Bucket not ready, cannot test upload');
      return;
    }
    
    // Create a test image file (simple base64 encoded image)
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // Convert base64 to File-like object
    const base64Data = testImageData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create a File-like object
    const testFile = {
      name: 'test-upload.png',
      type: 'image/png',
      size: buffer.length,
      arrayBuffer: () => Promise.resolve(buffer.buffer),
      stream: () => new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(buffer));
          controller.close();
        }
      })
    };
    
    console.log('2. Attempting to upload test image...');
    const uploadResult = await uploadImageToSupabase(testFile, 'member-photos', 'test');
    
    if (uploadResult) {
      console.log('✅ Upload successful!');
      console.log('   URL:', uploadResult.url);
      console.log('   Path:', uploadResult.path);
    } else {
      console.log('❌ Upload failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testImageUpload();