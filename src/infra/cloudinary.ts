import { v2 as cloudinary } from "cloudinary";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_FOLDER || "wallteqhrms";

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  // do not throw in non-production; allow tests to mock
  console.warn("Cloudinary not fully configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)");
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });

export async function uploadBuffer(buffer: Buffer, filename: string, options: { folder?: string } = {}) {
  return new Promise<any>((resolve, reject) => {
    const opts: any = { resource_type: "auto", folder: options.folder || FOLDER, public_id: filename.replace(/\.[^.]+$/, "") };
    const stream = cloudinary.uploader.upload_stream(opts, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

export async function deleteResource(publicId: string) {
  return new Promise<any>((resolve, reject) => {
    const opts: any = { resource_type: "auto" };
    cloudinary.uploader.destroy(publicId, opts, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

export function urlFor(publicId: string, options: any = {}) {
  return cloudinary.url(publicId, { secure: true, ...options });
}

export default cloudinary;