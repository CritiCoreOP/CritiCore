// Shared i18n strings for auth email templates
export type EmailLang = 'de' | 'en' | 'fr' | 'es' | 'th'

const translations: Record<string, Record<EmailLang, string>> = {
  // Signup
  'signup.preview': { de: 'Bestätige deine E-Mail für CritiCore', en: 'Confirm your email for CritiCore', fr: 'Confirme ton email pour CritiCore', es: 'Confirma tu email para CritiCore', th: 'ยืนยันอีเมลของคุณสำหรับ CritiCore' },
  'signup.heading': { de: 'E-Mail bestätigen', en: 'Confirm Email', fr: 'Confirmer l\'email', es: 'Confirmar email', th: 'ยืนยันอีเมล' },
  'signup.col1Title': { de: 'Fast geschafft:', en: 'Almost there:', fr: 'Presque terminé :', es: 'Casi listo:', th: 'เกือบแล้ว:' },
  'signup.col1Text': { de: 'Bestätige deine E-Mail-Adresse, um dein CritiCore-Konto zu aktivieren.', en: 'Confirm your email address to activate your CritiCore account.', fr: 'Confirme ton adresse email pour activer ton compte CritiCore.', es: 'Confirma tu dirección de email para activar tu cuenta de CritiCore.', th: 'ยืนยันที่อยู่อีเมลเพื่อเปิดใช้งานบัญชี CritiCore' },
  'signup.col2Title': { de: 'Nicht du gewesen?', en: 'Wasn\'t you?', fr: 'Pas toi ?', es: '¿No fuiste tú?', th: 'ไม่ใช่คุณ?' },
  'signup.col2Text': { de: 'Dann ignoriere diese E-Mail einfach', en: 'Then just ignore this email', fr: 'Alors ignore simplement cet email', es: 'Entonces simplemente ignora este email', th: 'เพิกเฉยอีเมลนี้ได้เลย' },
  'signup.button': { de: 'E-Mail bestätigen', en: 'Confirm Email', fr: 'Confirmer l\'email', es: 'Confirmar email', th: 'ยืนยันอีเมล' },

  // Recovery
  'recovery.preview': { de: 'Setze dein CritiCore Passwort zurück', en: 'Reset your CritiCore password', fr: 'Réinitialise ton mot de passe CritiCore', es: 'Restablece tu contraseña de CritiCore', th: 'รีเซ็ตรหัสผ่าน CritiCore ของคุณ' },
  'recovery.heading': { de: 'Passwort vergessen?', en: 'Forgot your password?', fr: 'Mot de passe oublié ?', es: '¿Olvidaste tu contraseña?', th: 'ลืมรหัสผ่าน?' },
  'recovery.col1Title': { de: 'Deine Anfrage', en: 'Your request', fr: 'Ta demande', es: 'Tu solicitud', th: 'คำขอของคุณ' },
  'recovery.col1Text': { de: 'Wir haben eine Anfrage erhalten, dein Passwort zurückzusetzen.', en: 'We received a request to reset your password.', fr: 'Nous avons reçu une demande de réinitialisation de ton mot de passe.', es: 'Hemos recibido una solicitud para restablecer tu contraseña.', th: 'เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ' },
  'recovery.col2Title': { de: 'Nicht du?', en: 'Not you?', fr: 'Pas toi ?', es: '¿No fuiste tú?', th: 'ไม่ใช่คุณ?' },
  'recovery.col2Text': { de: 'Dann kannst du diese E-Mail einfach ignorieren. Dein Passwort bleibt unverändert.', en: 'You can safely ignore this email. Your password will remain unchanged.', fr: 'Tu peux simplement ignorer cet email. Ton mot de passe restera inchangé.', es: 'Puedes ignorar este email. Tu contraseña no cambiará.', th: 'คุณสามารถเพิกเฉยอีเมลนี้ได้ รหัสผ่านของคุณจะไม่เปลี่ยนแปลง' },
  'recovery.button': { de: 'Passwort zurücksetzen', en: 'Reset Password', fr: 'Réinitialiser le mot de passe', es: 'Restablecer contraseña', th: 'รีเซ็ตรหัสผ่าน' },
  'recovery.orButton': { de: 'Oder direkt über den Button:', en: 'Or use the button below:', fr: 'Ou clique sur le bouton :', es: 'O haz clic en el botón:', th: 'หรือคลิกปุ่มด้านล่าง:' },

  // Magic Link
  'magiclink.preview': { de: 'Dein Login-Link für CritiCore', en: 'Your login link for CritiCore', fr: 'Ton lien de connexion CritiCore', es: 'Tu enlace de inicio de sesión de CritiCore', th: 'ลิงก์เข้าสู่ระบบ CritiCore ของคุณ' },
  'magiclink.heading': { de: 'Magic Link Login', en: 'Magic Link Login', fr: 'Connexion Magic Link', es: 'Inicio de sesión con Magic Link', th: 'เข้าสู่ระบบ Magic Link' },
  'magiclink.col1Title': { de: 'Login angefordert:', en: 'Login requested:', fr: 'Connexion demandée :', es: 'Inicio de sesión solicitado:', th: 'ร้องขอเข้าสู่ระบบ:' },
  'magiclink.col1Text': { de: 'Du möchtest dich bei CritiCore einloggen. Klicke den Button unten.', en: 'You want to log in to CritiCore. Click the button below.', fr: 'Tu veux te connecter à CritiCore. Clique sur le bouton ci-dessous.', es: 'Quieres iniciar sesión en CritiCore. Haz clic en el botón de abajo.', th: 'คุณต้องการเข้าสู่ระบบ CritiCore คลิกปุ่มด้านล่าง' },
  'magiclink.col2Title': { de: 'Nicht du gewesen?', en: 'Wasn\'t you?', fr: 'Pas toi ?', es: '¿No fuiste tú?', th: 'ไม่ใช่คุณ?' },
  'magiclink.col2Text': { de: 'Dann ignoriere diese E-Mail einfach', en: 'Then just ignore this email', fr: 'Alors ignore simplement cet email', es: 'Entonces simplemente ignora este email', th: 'เพิกเฉยอีเมลนี้ได้เลย' },
  'magiclink.button': { de: 'Einloggen', en: 'Log in', fr: 'Se connecter', es: 'Iniciar sesión', th: 'เข้าสู่ระบบ' },

  // Invite
  'invite.preview': { de: 'Du wurdest zu CritiCore eingeladen', en: 'You\'ve been invited to CritiCore', fr: 'Tu as été invité(e) sur CritiCore', es: 'Has sido invitado a CritiCore', th: 'คุณได้รับเชิญเข้าร่วม CritiCore' },
  'invite.heading': { de: 'Du wurdest eingeladen', en: 'You\'ve been invited', fr: 'Tu es invité(e)', es: 'Has sido invitado', th: 'คุณได้รับเชิญ' },
  'invite.col1Title': { de: 'Einladung:', en: 'Invitation:', fr: 'Invitation :', es: 'Invitación:', th: 'คำเชิญ:' },
  'invite.col1Text': { de: 'Du wurdest eingeladen, CritiCore beizutreten. Klicke den Button unten.', en: 'You\'ve been invited to join CritiCore. Click the button below.', fr: 'Tu as été invité(e) à rejoindre CritiCore. Clique sur le bouton.', es: 'Has sido invitado a unirte a CritiCore. Haz clic en el botón.', th: 'คุณได้รับเชิญเข้าร่วม CritiCore คลิกปุ่มด้านล่าง' },
  'invite.col2Title': { de: 'Nicht erwartet?', en: 'Unexpected?', fr: 'Pas attendu ?', es: '¿Inesperado?', th: 'ไม่คาดคิด?' },
  'invite.col2Text': { de: 'Dann ignoriere diese E-Mail einfach', en: 'Then just ignore this email', fr: 'Alors ignore simplement cet email', es: 'Entonces simplemente ignora este email', th: 'เพิกเฉยอีเมลนี้ได้เลย' },
  'invite.button': { de: 'Einladung annehmen', en: 'Accept Invitation', fr: 'Accepter l\'invitation', es: 'Aceptar invitación', th: 'ยอมรับคำเชิญ' },

  // Email Change
  'emailchange.preview': { de: 'Bestätige deine neue E-Mail-Adresse für CritiCore', en: 'Confirm your new email for CritiCore', fr: 'Confirme ta nouvelle adresse email pour CritiCore', es: 'Confirma tu nuevo email para CritiCore', th: 'ยืนยันอีเมลใหม่ของคุณสำหรับ CritiCore' },
  'emailchange.heading': { de: 'E-Mail ändern', en: 'Change Email', fr: 'Changer d\'email', es: 'Cambiar email', th: 'เปลี่ยนอีเมล' },
  'emailchange.col1Title': { de: 'Änderung angefragt:', en: 'Change requested:', fr: 'Changement demandé :', es: 'Cambio solicitado:', th: 'ร้องขอเปลี่ยน:' },
  'emailchange.col1TextPrefix': { de: 'Von ', en: 'From ', fr: 'De ', es: 'De ', th: 'จาก ' },
  'emailchange.col1TextMiddle': { de: ' zu ', en: ' to ', fr: ' à ', es: ' a ', th: ' เป็น ' },
  'emailchange.col2Title': { de: 'Nicht du gewesen?', en: 'Wasn\'t you?', fr: 'Pas toi ?', es: '¿No fuiste tú?', th: 'ไม่ใช่คุณ?' },
  'emailchange.col2Text': { de: 'Sichere sofort dein Konto', en: 'Secure your account immediately', fr: 'Sécurise ton compte immédiatement', es: 'Asegura tu cuenta de inmediato', th: 'รีบรักษาความปลอดภัยบัญชีทันที' },
  'emailchange.button': { de: 'E-Mail bestätigen', en: 'Confirm Email', fr: 'Confirmer l\'email', es: 'Confirmar email', th: 'ยืนยันอีเมล' },

  // Reauthentication
  'reauth.preview': { de: 'Dein CritiCore Bestätigungscode: ', en: 'Your CritiCore verification code: ', fr: 'Ton code de vérification CritiCore : ', es: 'Tu código de verificación CritiCore: ', th: 'รหัสยืนยัน CritiCore ของคุณ: ' },
  'reauth.heading': { de: 'Identität bestätigen', en: 'Verify Identity', fr: 'Vérifier l\'identité', es: 'Verificar identidad', th: 'ยืนยันตัวตน' },
  'reauth.col1Title': { de: 'Bestätigung:', en: 'Verification:', fr: 'Vérification :', es: 'Verificación:', th: 'การยืนยัน:' },
  'reauth.col1Text': { de: 'Gib den folgenden Code ein, um deine Identität zu bestätigen.', en: 'Enter the following code to verify your identity.', fr: 'Entre le code suivant pour vérifier ton identité.', es: 'Ingresa el siguiente código para verificar tu identidad.', th: 'กรอกรหัสต่อไปนี้เพื่อยืนยันตัวตน' },
  'reauth.col2Title': { de: 'Nicht du gewesen?', en: 'Wasn\'t you?', fr: 'Pas toi ?', es: '¿No fuiste tú?', th: 'ไม่ใช่คุณ?' },
  'reauth.col2Text': { de: 'Dann ignoriere diese E-Mail einfach', en: 'Then just ignore this email', fr: 'Alors ignore simplement cet email', es: 'Entonces simplemente ignora este email', th: 'เพิกเฉยอีเมลนี้ได้เลย' },
  'reauth.codeLabel': { de: 'Dein Code:', en: 'Your Code:', fr: 'Ton code :', es: 'Tu código:', th: 'รหัสของคุณ:' },
  'code.orEnter': { de: 'Oder gib diesen Code auf der Seite ein:', en: 'Or enter this code on the page:', fr: 'Ou saisis ce code sur la page :', es: 'O introduce este código en la página:', th: 'หรือป้อนรหัสนี้บนหน้าเว็บ:' },

  // OTP (signup verification)
  'otp.preview': { de: 'Dein CritiCore Verifizierungscode: ', en: 'Your CritiCore verification code: ', fr: 'Ton code de vérification CritiCore : ', es: 'Tu código de verificación CritiCore: ', th: 'รหัสยืนยัน CritiCore ของคุณ: ' },
  'otp.heading': { de: 'Verifizierungscode', en: 'Verification Code', fr: 'Code de vérification', es: 'Código de verificación', th: 'รหัสยืนยัน' },
  'otp.col1Title': { de: 'Dein Code', en: 'Your Code', fr: 'Ton code', es: 'Tu código', th: 'รหัสของคุณ' },
  'otp.col1Text': { de: 'Gib den folgenden Code ein, um dein Login zu bestätigen.', en: 'Enter the following code to confirm your login.', fr: 'Entre le code suivant pour confirmer ta connexion.', es: 'Ingresa el siguiente código para confirmar tu inicio de sesión.', th: 'กรอกรหัสต่อไปนี้เพื่อยืนยันการเข้าสู่ระบบ' },
  'otp.col2Title': { de: 'Nicht du?', en: 'Not you?', fr: 'Pas toi ?', es: '¿No fuiste tú?', th: 'ไม่ใช่คุณ?' },
  'otp.col2Text': { de: 'Falls du denkst, dass jemand auf dein Konto zugreift, ändere sofort dein Passwort.', en: 'If you think someone is accessing your account, change your password immediately.', fr: 'Si tu penses que quelqu\'un accède à ton compte, change immédiatement ton mot de passe.', es: 'Si crees que alguien está accediendo a tu cuenta, cambia tu contraseña inmediatamente.', th: 'หากคุณคิดว่ามีคนเข้าถึงบัญชีของคุณ ให้เปลี่ยนรหัสผ่านทันที' },
  'otp.codeLabel': { de: 'Dein Code', en: 'Your Code', fr: 'Ton code', es: 'Tu código', th: 'รหัสของคุณ' },
  'otp.expiry': { de: 'Dieser Code ist 10 Minuten gültig.', en: 'This code is valid for 10 minutes.', fr: 'Ce code est valable 10 minutes.', es: 'Este código es válido por 10 minutos.', th: 'รหัสนี้ใช้ได้ 10 นาที' },
  'otp.subject': { de: 'Dein CritiCore Verifizierungscode', en: 'Your CritiCore verification code', fr: 'Ton code de vérification CritiCore', es: 'Tu código de verificación CritiCore', th: 'รหัสยืนยัน CritiCore ของคุณ' },

  // Reset OTP
  'reset.preview': { de: 'Dein CritiCore Reset-Code: ', en: 'Your CritiCore reset code: ', fr: 'Ton code de réinitialisation CritiCore : ', es: 'Tu código de restablecimiento CritiCore: ', th: 'รหัสรีเซ็ต CritiCore ของคุณ: ' },
  'reset.heading': { de: 'Passwort vergessen?', en: 'Forgot your password?', fr: 'Mot de passe oublié ?', es: '¿Olvidaste tu contraseña?', th: 'ลืมรหัสผ่าน?' },
  'reset.col1Title': { de: 'Deine Anfrage', en: 'Your request', fr: 'Ta demande', es: 'Tu solicitud', th: 'คำขอของคุณ' },
  'reset.col1Text': { de: 'Wir haben eine Anfrage erhalten, dein Passwort zurückzusetzen.', en: 'We received a request to reset your password.', fr: 'Nous avons reçu une demande de réinitialisation de ton mot de passe.', es: 'Hemos recibido una solicitud para restablecer tu contraseña.', th: 'เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ' },
  'reset.col2Title': { de: 'Nicht du?', en: 'Not you?', fr: 'Pas toi ?', es: '¿No fuiste tú?', th: 'ไม่ใช่คุณ?' },
  'reset.col2Text': { de: 'Dann kannst du diese E-Mail einfach ignorieren. Dein Passwort bleibt unverändert.', en: 'You can safely ignore this email. Your password will remain unchanged.', fr: 'Tu peux simplement ignorer cet email. Ton mot de passe restera inchangé.', es: 'Puedes ignorar este email. Tu contraseña no cambiará.', th: 'คุณสามารถเพิกเฉยอีเมลนี้ได้ รหัสผ่านของคุณจะไม่เปลี่ยนแปลง' },
  'reset.codeLabel': { de: 'Dein Reset-Code', en: 'Your Reset Code', fr: 'Ton code de réinitialisation', es: 'Tu código de restablecimiento', th: 'รหัสรีเซ็ตของคุณ' },
  'reset.expiry': { de: 'Dieser Code ist 10 Minuten gültig.', en: 'This code is valid for 10 minutes.', fr: 'Ce code est valable 10 minutes.', es: 'Este código es válido por 10 minutos.', th: 'รหัสนี้ใช้ได้ 10 นาที' },
  'reset.subject': { de: 'Dein CritiCore Passwort-Reset-Code', en: 'Your CritiCore password reset code', fr: 'Ton code de réinitialisation CritiCore', es: 'Tu código de restablecimiento CritiCore', th: 'รหัสรีเซ็ตรหัสผ่าน CritiCore ของคุณ' },

  // Ticket
  'ticket.preview': { de: 'Dein Ticket {id} wird jetzt überprüft', en: 'Your ticket {id} is being reviewed', fr: 'Ton ticket {id} est en cours d\'examen', es: 'Tu ticket {id} está siendo revisado', th: 'ตั๋ว {id} ของคุณกำลังได้รับการตรวจสอบ' },
  'ticket.heading': { de: 'Ticket wird überprüft', en: 'Ticket Under Review', fr: 'Ticket en cours d\'examen', es: 'Ticket en revisión', th: 'ตั๋วอยู่ระหว่างการตรวจสอบ' },
  'ticket.col1Title': { de: 'Dein Ticket', en: 'Your Ticket', fr: 'Ton ticket', es: 'Tu ticket', th: 'ตั๋วของคุณ' },
  'ticket.col1TextSupport': { de: 'Dein Support-Ticket {id} wird jetzt überprüft.', en: 'Your support ticket {id} is now being reviewed.', fr: 'Ton ticket de support {id} est en cours d\'examen.', es: 'Tu ticket de soporte {id} está siendo revisado.', th: 'ตั๋วสนับสนุน {id} ของคุณกำลังได้รับการตรวจสอบ' },
  'ticket.col1TextDmca': { de: 'Dein DMCA-Ticket {id} wird jetzt überprüft.', en: 'Your DMCA ticket {id} is now being reviewed.', fr: 'Ton ticket DMCA {id} est en cours d\'examen.', es: 'Tu ticket DMCA {id} está siendo revisado.', th: 'ตั๋ว DMCA {id} ของคุณกำลังได้รับการตรวจสอบ' },
  'ticket.idLabel': { de: 'Ticket-Nr.', en: 'Ticket no.', fr: 'N° de ticket', es: 'N.º de ticket', th: 'หมายเลขตั๋ว' },
  'ticket.notice': { de: 'Du erhältst diese E-Mail, weil du über CritiCore ein Ticket erstellt hast.', en: 'You are receiving this email because you created a ticket on CritiCore.', fr: 'Tu reçois cet email car tu as créé un ticket sur CritiCore.', es: 'Recibes este email porque creaste un ticket en CritiCore.', th: 'คุณได้รับอีเมลนี้เพราะคุณสร้างตั๋วบน CritiCore' },
  'ticket.subjectLabel': { de: 'Betreff', en: 'Subject', fr: 'Objet', es: 'Asunto', th: 'หัวข้อ' },
  'ticket.col2Title': { de: 'Was passiert jetzt?', en: 'What happens next?', fr: 'Que se passe-t-il ensuite ?', es: '¿Qué pasa ahora?', th: 'จะเกิดอะไรขึ้นต่อไป?' },
  'ticket.col2Text': { de: 'Du musst nichts Weiteres tun. TGN prüft jetzt dein Ticket und sendet dir eine E-Mail, wenn es Neuigkeiten gibt.', en: 'No further action is needed. TGN is reviewing your ticket and will email you with updates.', fr: 'Tu n\'as rien d\'autre à faire. TGN examine ton ticket et t\'enverra un email avec les mises à jour.', es: 'No necesitas hacer nada más. TGN está revisando tu ticket y te enviará un email con novedades.', th: 'คุณไม่ต้องทำอะไรเพิ่มเติม TGN กำลังตรวจสอบตั๋วของคุณและจะส่งอีเมลแจ้งข่าวสาร' },
  'ticket.dmcaPriority': { de: 'DMCA-Anträge haben höhere Priorität.', en: 'DMCA requests are given higher priority.', fr: 'Les demandes DMCA ont une priorité plus élevée.', es: 'Las solicitudes DMCA tienen mayor prioridad.', th: 'คำร้อง DMCA ได้รับความสำคัญสูงกว่า' },
  'ticket.button': { de: 'Zum Ticketstatus →', en: 'View Ticket Status →', fr: 'Voir le statut du ticket →', es: 'Ver estado del ticket →', th: 'ดูสถานะตั๋ว →' },
  'ticket.fallback': { de: 'Wenn wir nicht innerhalb von 2–3 Werktagen antworten, schreibe uns an', en: 'If we don\'t respond within 2–3 business days, contact us at', fr: 'Si nous ne répondons pas sous 2-3 jours ouvrables, contacte-nous à', es: 'Si no respondemos en 2-3 días hábiles, escríbenos a', th: 'หากเราไม่ตอบภายใน 2-3 วันทำการ ติดต่อเราที่' },
  'ticket.subjectDmca': { de: 'DMCA-Antrag eingegangen – Ticket {id}', en: 'DMCA request received – Ticket {id}', fr: 'Demande DMCA reçue – Ticket {id}', es: 'Solicitud DMCA recibida – Ticket {id}', th: 'ได้รับคำร้อง DMCA – ตั๋ว {id}' },
  'ticket.subjectSupport': { de: 'Support-Ticket erstellt – {id}', en: 'Support ticket created – {id}', fr: 'Ticket de support créé – {id}', es: 'Ticket de soporte creado – {id}', th: 'สร้างตั๋วสนับสนุนแล้ว – {id}' },

  // Newsletter confirm
  'newsletter.preview': { de: 'Bestätige dein Newsletter-Abo für CritiCore', en: 'Confirm your CritiCore newsletter subscription', fr: 'Confirme ton abonnement à la newsletter CritiCore', es: 'Confirma tu suscripción al boletín de CritiCore', th: 'ยืนยันการสมัครรับจดหมายข่าว CritiCore' },
  'newsletter.heading': { de: 'Newsletter bestätigen', en: 'Confirm Newsletter', fr: 'Confirmer la newsletter', es: 'Confirmar boletín', th: 'ยืนยันจดหมายข่าว' },
  'newsletter.col1Title': { de: 'Fast geschafft:', en: 'Almost there:', fr: 'Presque terminé :', es: 'Casi listo:', th: 'เกือบแล้ว:' },
  'newsletter.col1Text': { de: 'Du hast dich für den CritiCore-Newsletter angemeldet. Bestätige jetzt dein Abo.', en: 'You signed up for the CritiCore newsletter. Confirm your subscription now.', fr: 'Tu t\'es inscrit(e) à la newsletter CritiCore. Confirme ton abonnement maintenant.', es: 'Te registraste en el boletín de CritiCore. Confirma tu suscripción ahora.', th: 'คุณได้สมัครรับจดหมายข่าว CritiCore ยืนยันการสมัครตอนนี้' },
  'newsletter.col2Title': { de: 'Nicht angemeldet?', en: 'Didn\'t sign up?', fr: 'Pas inscrit(e) ?', es: '¿No te registraste?', th: 'ไม่ได้สมัคร?' },
  'newsletter.col2Text': { de: 'Dann kannst du diese E-Mail einfach ignorieren.', en: 'You can safely ignore this email.', fr: 'Tu peux simplement ignorer cet email.', es: 'Puedes ignorar este email.', th: 'คุณสามารถเพิกเฉยอีเมลนี้ได้' },
  'newsletter.notice': { de: 'Du erhältst diese E-Mail, weil diese Adresse für den CritiCore-Newsletter eingetragen wurde.', en: 'You are receiving this email because this address was entered for the CritiCore newsletter.', fr: 'Tu reçois cet email car cette adresse a été inscrite à la newsletter CritiCore.', es: 'Recibes este email porque esta dirección se registró en el boletín de CritiCore.', th: 'คุณได้รับอีเมลนี้เพราะที่อยู่นี้ถูกลงทะเบียนรับจดหมายข่าว CritiCore' },
  'newsletter.button': { de: 'Abo bestätigen', en: 'Confirm Subscription', fr: 'Confirmer l\'abonnement', es: 'Confirmar suscripción', th: 'ยืนยันการสมัคร' },
  'newsletter.subject': { de: 'Bitte bestätige dein Newsletter-Abo', en: 'Please confirm your newsletter subscription', fr: 'Veuillez confirmer votre abonnement', es: 'Confirma tu suscripción al boletín', th: 'กรุณายืนยันการสมัครรับจดหมายข่าว' },

  // Newsletter issue (Versand aus dem Admin-Bereich)
  'newsletterIssue.eyebrow': { de: 'CritiCore Newsletter', en: 'CritiCore Newsletter', fr: 'Newsletter CritiCore', es: 'Boletín de CritiCore', th: 'จดหมายข่าว CritiCore' },
  'newsletterIssue.notice': { de: 'Du erhältst diesen Newsletter, weil du ihn auf criticore.cc abonniert und bestätigt hast.', en: 'You are receiving this newsletter because you subscribed to it on criticore.cc and confirmed.', fr: 'Tu reçois cette newsletter car tu t\'y es abonné(e) sur criticore.cc et l\'as confirmée.', es: 'Recibes este boletín porque te suscribiste en criticore.cc y lo confirmaste.', th: 'คุณได้รับจดหมายข่าวนี้เพราะคุณสมัครและยืนยันบน criticore.cc' },
  'newsletterIssue.unsubscribeText': { de: 'Kein Interesse mehr?', en: 'Not interested anymore?', fr: 'Plus intéressé(e) ?', es: '¿Ya no te interesa?', th: 'ไม่สนใจแล้ว?' },
  'newsletterIssue.unsubscribeLink': { de: 'Newsletter abbestellen', en: 'Unsubscribe', fr: 'Se désabonner', es: 'Cancelar suscripción', th: 'ยกเลิกการสมัคร' },
  'newsletterIssue.readMore': { de: 'Weiterlesen', en: 'Read more', fr: 'Lire la suite', es: 'Seguir leyendo', th: 'อ่านต่อ' },
  'newsletterIssue.category.games': { de: 'Games', en: 'Games', fr: 'Jeux', es: 'Juegos', th: 'เกม' },
  'newsletterIssue.category.movies': { de: 'Filme', en: 'Movies', fr: 'Films', es: 'Películas', th: 'ภาพยนตร์' },
  'newsletterIssue.category.series': { de: 'Serien', en: 'Series', fr: 'Séries', es: 'Series', th: 'ซีรีส์' },
  'newsletterIssue.category.general': { de: 'News', en: 'News', fr: 'Actu', es: 'Noticias', th: 'ข่าว' },
  'newsletterIssue.category.patchnotes': { de: 'Patchnotes', en: 'Patch notes', fr: 'Notes de patch', es: 'Notas del parche', th: 'แพตช์โน้ต' },

  // Shared
  'shared.copyright': { de: '© 2026 TGN, Redaim, CritiCore. Alle Rechte vorbehalten.', en: '© 2026 TGN, Redaim, CritiCore. All rights reserved.', fr: '© 2026 TGN, Redaim, CritiCore. Tous droits réservés.', es: '© 2026 TGN, Redaim, CritiCore. Todos los derechos reservados.', th: '© 2026 TGN, Redaim, CritiCore สงวนลิขสิทธิ์' },
  'shared.support': { de: 'Fragen? Support@criticore.cc', en: 'Questions? Support@criticore.cc', fr: 'Questions ? Support@criticore.cc', es: '¿Preguntas? Support@criticore.cc', th: 'คำถาม? Support@criticore.cc' },
  'shared.tagline': { de: 'Deine Plattform für ehrliche Reviews und Bewertungen.', en: 'Your platform for honest reviews and ratings.', fr: 'Ta plateforme pour des critiques honnêtes et des évaluations.', es: 'Tu plataforma para reseñas honestas y valoraciones.', th: 'แพลตฟอร์มสำหรับรีวิวและการให้คะแนนอย่างจริงใจ' },
  'shared.linkFallback': { de: 'Button funktioniert nicht? Öffne diesen Link:', en: 'Button not working? Open this link:', fr: 'Le bouton ne marche pas ? Ouvre ce lien :', es: '¿El botón no funciona? Abre este enlace:', th: 'ปุ่มใช้งานไม่ได้? เปิดลิงก์นี้:' },
  'shared.help': { de: 'Hilfe', en: 'Help', fr: 'Aide', es: 'Ayuda', th: 'ช่วยเหลือ' },
  'shared.privacy': { de: 'Datenschutz', en: 'Privacy', fr: 'Confidentialité', es: 'Privacidad', th: 'ความเป็นส่วนตัว' },
  'shared.terms': { de: 'AGB', en: 'Terms', fr: 'CGU', es: 'Términos', th: 'ข้อกำหนด' },
  'shared.accountNotice': { de: 'Du erhältst diese E-Mail, weil du ein CritiCore-Konto hast.', en: 'You are receiving this email because you have a CritiCore account.', fr: 'Tu reçois cet email car tu possèdes un compte CritiCore.', es: 'Recibes este email porque tienes una cuenta de CritiCore.', th: 'คุณได้รับอีเมลนี้เพราะคุณมีบัญชี CritiCore' },
  'shared.rateLimitHour': { de: 'Zu viele Anfragen. Bitte warte eine Stunde und versuche es erneut.', en: 'Too many requests. Please wait an hour and try again.', fr: 'Trop de demandes. Veuillez attendre une heure et réessayer.', es: 'Demasiadas solicitudes. Espera una hora y vuelve a intentarlo.', th: 'คำขอมากเกินไป กรุณารอหนึ่งชั่วโมงแล้วลองอีกครั้ง' },
  // Release reminder (release-reminders)
  'release.subject': { de: '{title} ist da', en: '{title} is out', fr: '{title} est sorti', es: '{title} ya está aquí', th: '{title} มาแล้ว' },
  'release.preview': { de: 'Deine Erinnerung: {title} erscheint heute.', en: 'Your reminder: {title} comes out today.', fr: 'Ton rappel : {title} sort aujourd\'hui.', es: 'Tu recordatorio: {title} sale hoy.', th: 'การแจ้งเตือนของคุณ: {title} วางจำหน่ายวันนี้' },
  'release.eyebrow': { de: 'Release-Erinnerung', en: 'Release reminder', fr: 'Rappel de sortie', es: 'Recordatorio de lanzamiento', th: 'แจ้งเตือนวันวางจำหน่าย' },
  'release.text': { de: 'Du wolltest erinnert werden: {title} erscheint heute, am {date}.', en: 'You asked us to remind you: {title} comes out today, {date}.', fr: 'Tu voulais un rappel : {title} sort aujourd\'hui, le {date}.', es: 'Querías que te lo recordáramos: {title} sale hoy, {date}.', th: 'คุณขอให้เราแจ้งเตือน: {title} วางจำหน่ายวันนี้ {date}' },
  'release.button': { de: 'Auf CritiCore ansehen', en: 'View on CritiCore', fr: 'Voir sur CritiCore', es: 'Ver en CritiCore', th: 'ดูบน CritiCore' },
  'release.notice': { de: 'Du erhältst diese E-Mail, weil du auf CritiCore eine Erinnerung für diesen Titel gesetzt hast. Jede Erinnerung kommt nur einmal.', en: 'You are receiving this email because you set a reminder for this title on CritiCore. Each reminder is sent only once.', fr: 'Tu reçois cet e-mail car tu as activé un rappel pour ce titre sur CritiCore. Chaque rappel n\'est envoyé qu\'une fois.', es: 'Recibes este correo porque activaste un recordatorio para este título en CritiCore. Cada recordatorio se envía solo una vez.', th: 'คุณได้รับอีเมลนี้เพราะตั้งการแจ้งเตือนสำหรับเรื่องนี้บน CritiCore การแจ้งเตือนแต่ละครั้งจะส่งเพียงครั้งเดียว' },
  'shared.rateLimitCooldown': { de: 'Bitte warte mindestens 60 Sekunden bevor du einen neuen Code anforderst.', en: 'Please wait at least 60 seconds before requesting a new code.', fr: 'Veuillez attendre au moins 60 secondes avant de demander un nouveau code.', es: 'Espera al menos 60 segundos antes de solicitar un nuevo código.', th: 'กรุณารออย่างน้อย 60 วินาทีก่อนขอรหัสใหม่' },
}

export function t(key: string, lang: EmailLang = 'de'): string {
  return translations[key]?.[lang] ?? translations[key]?.['de'] ?? key
}

export function getLangFromCode(code?: string): EmailLang {
  if (!code) return 'de'
  const short = code.substring(0, 2).toLowerCase()
  if (['de', 'en', 'fr', 'es', 'th'].includes(short)) return short as EmailLang
  return 'de'
}

export const EMAIL_SUBJECTS_I18N: Record<string, Record<EmailLang, string>> = {
  signup: { de: 'E-Mail bestätigen', en: 'Confirm your email', fr: 'Confirme ton email', es: 'Confirma tu email', th: 'ยืนยันอีเมลของคุณ' },
  invite: { de: 'Du wurdest eingeladen', en: "You've been invited", fr: 'Tu as été invité(e)', es: 'Has sido invitado', th: 'คุณได้รับเชิญ' },
  magiclink: { de: 'Dein Login-Link', en: 'Your login link', fr: 'Ton lien de connexion', es: 'Tu enlace de acceso', th: 'ลิงก์เข้าสู่ระบบของคุณ' },
  recovery: { de: 'Passwort zurücksetzen', en: 'Reset your password', fr: 'Réinitialise ton mot de passe', es: 'Restablece tu contraseña', th: 'รีเซ็ตรหัสผ่านของคุณ' },
  email_change: { de: 'Neue E-Mail bestätigen', en: 'Confirm your new email', fr: 'Confirme ta nouvelle adresse', es: 'Confirma tu nuevo email', th: 'ยืนยันอีเมลใหม่' },
  reauthentication: { de: 'Bestätigungscode', en: 'Your verification code', fr: 'Ton code de vérification', es: 'Tu código de verificación', th: 'รหัสยืนยันของคุณ' },
}
