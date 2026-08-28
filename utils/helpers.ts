export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyrzPMGtKYSVQYtzA0uzV2Rl0-_n6Z3XumyBcvPEMRXmrnn6lBBUa28jD1kS1j-i7glQg/exec"; 

export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const uploadFileToGoogleDrive = async (file: File, folderName: string) => {
  try {
    const base64 = await convertToBase64(file);
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        base64: base64,
        folderName: folderName
      }),
      headers: { "Content-Type": "text/plain;charset=utf-8" } 
    });
    
    const result = await response.json();
    if (result.status === 'success') {
      return result.viewLink;
    } else {
      throw new Error(result.message || 'Upload failed');
    }
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

export const generateTrackingId = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `REQ-${yyyy}${mm}${dd}-${random}`;
};