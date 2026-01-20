import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

export function useImageUpload() {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const uploadImage = async (file, path) => {
        if (!file) return null;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setError("Please select a valid image file");
            return null;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("Image size should be less than 5MB");
            return null;
        }

        try {
            setUploading(true);
            setError(null);

            // Create a unique filename
            const timestamp = Date.now();
            const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
            const fullPath = `${path}/${filename}`;
            const storageRef = ref(storage, fullPath);

            // Upload file
            const snapshot = await uploadBytes(storageRef, file);

            // Get download URL
            const downloadURL = await getDownloadURL(snapshot.ref);

            return downloadURL;
        } catch (err) {
            console.error("Upload failed:", err);
            setError("Failed to upload image. Please try again.");
            return null;
        } finally {
            setUploading(false);
        }
    };

    return { uploadImage, uploading, error };
}
