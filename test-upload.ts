import fs from 'fs';
import path from 'path';

async function testUpload() {
  try {
    // Create a dummy 1x1 PNG
    const imgBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const imgBuffer = Buffer.from(imgBase64, 'base64');
    const filePath = path.join(process.cwd(), 'test.png');
    fs.writeFileSync(filePath, imgBuffer);

    const formData = new FormData();
    const blob = new Blob([imgBuffer], { type: 'image/png' });
    formData.append('image', blob, 'test.png');

    console.log("Sending request to http://localhost:3000/api/process-receipt...");
    const response = await fetch('http://localhost:3000/api/process-receipt', {
      method: 'POST',
      body: formData,
    });

    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
  } catch (e) {
    console.error("Test failed:", e);
  }
}
testUpload();
