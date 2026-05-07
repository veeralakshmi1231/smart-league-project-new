// src/utils/emailService.js

import { ENDPOINTS } from '../config/api';

const API_URL = ENDPOINTS.SEND_EMAIL;

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Email service error:', error);
    // We don't want to crash the app if email fails, so we just log it
    // but we could throw it if the UI needs to handle it.
    return { error: error.message };
  }
};
