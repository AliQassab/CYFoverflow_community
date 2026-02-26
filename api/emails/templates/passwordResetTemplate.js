// api/emails/templates/passwordResetTemplate.js
import { escapeHtml } from "./templateUtils.js";

export const getPasswordResetHtml = ({ userName, resetUrl }) => {
	const safeUserName = escapeHtml(userName || "User");
	const safeResetUrl = escapeHtml(resetUrl || "");

	return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6; 
                    color: #333;
                    margin: 0;
                    padding: 0;
                    background-color: #f5f5f5;
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: white;
                }
                .header { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 40px 20px;
                    text-align: center; 
                }
                .content { 
                    padding: 40px 30px;
                }
                .btn { 
                    display: inline-block; 
                    padding: 14px 32px; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 50px;
                    font-weight: 600;
                    font-size: 16px;
                    margin: 25px 0;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                }
                .warning-box { 
                    background: #fff3cd; 
                    padding: 20px; 
                    border-left: 4px solid #ffc107; 
                    margin: 30px 0; 
                    border-radius: 8px;
                }
                .footer { 
                    margin-top: 40px; 
                    color: #666; 
                    font-size: 14px;
                    text-align: center;
                    padding-top: 20px;
                    border-top: 1px solid #e9ecef;
                }
                h1 { margin: 0 0 10px 0; font-size: 28px; }
                h2 { color: #333; margin-top: 0; }
                p { margin: 15px 0; }
                .highlight { color: #667eea; font-weight: 600; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Password Reset Request</h1>
                    <p>Reset your CYFoverflow password</p>
                </div>
                <div class="content">
                    <h2>Hello ${safeUserName}!</h2>
                    
                    <p>We received a request to reset your password for your CYFoverflow account.</p>
                    
                    <p style="text-align: center;">
                        <a href="${safeResetUrl}" class="btn">Reset Password</a>
                    </p>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #667eea;">${safeResetUrl}</p>
                    
                    <div class="warning-box">
                        <p><strong>⚠️ Important:</strong></p>
                        <ul>
                            <li>This link will expire in <strong>1 hour</strong></li>
                            <li>If you didn't request this, you can safely ignore this email</li>
                            <li>Your password will not change until you click the link above</li>
                        </ul>
                    </div>
                    
                    <div class="footer">
                        <p>This email was sent by <span class="highlight">CYFoverflow</span> at cyf.academy.</p>
                        <p>You're receiving this because a password reset was requested for your account.</p>
                        <p style="font-size: 12px; color: #888;">
                            Sent at: ${new Date().toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

export const getPasswordResetText = ({ userName, resetUrl }) => {
	return `PASSWORD RESET REQUEST - CYFOVERFLOW

Hello ${userName || "User"}!

We received a request to reset your password for your CYFoverflow account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email. Your password will not change until you click the link above.

---
This email was sent by CYFoverflow at cyf.academy.
You're receiving this because a password reset was requested for your account.

Sent at: ${new Date().toLocaleString()}`;
};
