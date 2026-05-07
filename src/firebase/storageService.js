// src/firebase/storageService.js
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';
import { ENDPOINTS } from '../config/api';

/**
 * Upload a file to local backend server (Free Alternative to Firebase Storage)
 * @param {File} file - The file to upload
 * @param {string} _path - (Ignored for local)
 * @param {function} onProgress - (Simulated)
 * @returns {Promise<string>} Download URL
 */
export const uploadFile = async (file, _path, onProgress) => {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(ENDPOINTS.UPLOAD_LOCAL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Local upload failed');
    }

    const data = await response.json();
    if (onProgress) onProgress(100);
    return data.url;
  } catch (error) {
    console.error('Local storage error:', error);
    throw error;
  }
};

export const uploadAvatar = (uid, file, onProgress) =>
  uploadFile(file, `avatars/${uid}`, onProgress);

export const uploadAchievementImage = (achievementId, file, onProgress) =>
  uploadFile(file, `achievements/${achievementId}`, onProgress);

export const uploadNewsImage = (newsId, file, onProgress) =>
  uploadFile(file, `news/${newsId}`, onProgress);

export const deleteFile = async (url) => {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (e) {
    console.warn('Could not delete file:', e);
  }
};
