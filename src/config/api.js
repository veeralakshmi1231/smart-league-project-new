// src/config/api.js

const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// Replace the placeholder below with your Render URL after deployment
// Example: https://smart-league-backend.onrender.com
export const API_BASE_URL = isProduction 
  ? 'https://smart-league-project-new.onrender.com' 
  : 'http://localhost:5000';

export const ENDPOINTS = {
  CREATE_STAFF: `${API_BASE_URL}/create-staff`,
  DELETE_USER: `${API_BASE_URL}/delete-user-completely`,
  DELETE_BY_EMAIL: `${API_BASE_URL}/delete-user-by-email`,
  SEND_EMAIL: `${API_BASE_URL}/send-email`,
  UPLOAD_LOCAL: `${API_BASE_URL}/upload-local`,
};
