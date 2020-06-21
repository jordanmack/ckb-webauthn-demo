# CKB WebAuthn Demo

With the help of P-256 lockscript, we can now use Web Authn compatible browsers and devices to create a CKB address directly from a webpage, with a hardware security level key management.

### Instructions

1. **FIDO Authenticator**

   If you already have an authenticator compatible with the FIDO protocol (e.g. yubikey), then almost all platforms (except iOS for now) with modern browsers are available to play. We'll make extra works to add iOS support later.

   

2. **Mac with Touch ID**

   You can use the built-in Touch ID as an authenticator on you Mac, but this only works on Chrome for now. Apple's progress in this area has been relatively slow, and we are looking forward to see the built-in biometrics authenticators are well supported with Safari on both macOS and iOS.

   

3. **Android Phone with Fingerprint**

   You can use the built-in fingerprint on your Android phones as an authenticator to play with the demo. However cases have been reported that sometimes the signing procedure will have no response when you click the 'Send' button. We'll take a deep look into these cases later.

### Run

- `git clone https://github.com/fido-alliance/webauthn-demo/`
- `cd webauthn-demo`
- `npm install`
- `node app`
