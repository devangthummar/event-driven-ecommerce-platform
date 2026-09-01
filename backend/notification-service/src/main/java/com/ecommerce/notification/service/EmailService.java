package com.ecommerce.notification.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender javaMailSender;

    public void sendOrderConfirmationEmail(String toEmail, Long orderId, BigDecimal totalAmount) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("Order Confirmed - #" + orderId);

            String htmlContent = """
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                    </head>
                    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <div style="background-color: #4CAF50; color: #ffffff; padding: 20px; text-align: center;">
                                <h1 style="margin: 0;">Order Confirmed!</h1>
                            </div>
                            <div style="padding: 30px;">
                                <p style="font-size: 16px; color: #333333;">Hello,</p>
                                <p style="font-size: 16px; color: #333333;">Thank you for your order. We're happy to let you know that your order has been confirmed.</p>
                                <div style="background-color: #f9f9f9; border-radius: 6px; padding: 20px; margin: 20px 0;">
                                    <table style="width: 100%%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 8px 0; font-size: 14px; color: #666666;">Order ID:</td>
                                            <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: bold;">#%d</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; font-size: 14px; color: #666666;">Total Amount:</td>
                                            <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: bold;">$%s</td>
                                        </tr>
                                    </table>
                                </div>
                                <p style="font-size: 16px; color: #333333;">We'll notify you when your order is shipped.</p>
                                <p style="font-size: 14px; color: #999999; margin-top: 30px;">If you have any questions, please don't hesitate to contact us.</p>
                            </div>
                            <div style="background-color: #f4f4f4; color: #999999; text-align: center; padding: 15px; font-size: 12px;">
                                &copy; 2026 E-Commerce Platform. All rights reserved.
                            </div>
                        </div>
                    </body>
                    </html>
                    """.formatted(orderId, totalAmount);

            helper.setText(htmlContent, true);

            javaMailSender.send(message);

            log.info("Order confirmation email sent successfully to={} for orderId={}", toEmail, orderId);

        } catch (MessagingException e) {
            log.error("Failed to send order confirmation email to={} for orderId={}: {}",
                    toEmail, orderId, e.getMessage(), e);
        }
    }

}
