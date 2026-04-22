import CryptoJS from 'crypto-js';

async function test() {
  const cloudName = "dx0thixdl";
  const apiKey = "437753281943692";
  const apiSecret = "i6ewcPROpxanIstnrRZi_bRWCpc";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = "freshfarm_receipts";
  
  const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = CryptoJS.SHA1(strToSign).toString(CryptoJS.enc.Hex);

  const cloudinaryFormData = new FormData();
  // Create a dummy file
  const blob = new Blob(['dummy content'], { type: 'text/plain' });
  cloudinaryFormData.append('file', blob, 'dummy.txt');
  cloudinaryFormData.append('api_key', apiKey);
  cloudinaryFormData.append('timestamp', timestamp);
  cloudinaryFormData.append('signature', signature);
  cloudinaryFormData.append('folder', folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    body: cloudinaryFormData as any
  });
  
  console.log(uploadResponse.status);
  console.log(await uploadResponse.text());
}
test();
