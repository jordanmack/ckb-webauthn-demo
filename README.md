# CKB WebAuthn Demo

This proof-of-concept demonstrates how WebAuthn enables users to sign transactions on the CKB blockchain without any additional software. WebAuthn relies on hardware-level secure key management that is available on modern desktops, laptops, tablets, and smartphones. This removes the need for reliance on passwords or seed phrases that can be lost or stolen. This means the user can interact with a dapp using a normal web browser, without the need for any kind of smart contract wallet.

Not all blockchains can use WebAuthn because it requires support for the NIST P-256 (secp256r1) crypto primitive. This is possible on Nervos because the CKB blockchain relies on [CKB-VM](https://linktr.ee/ckbvm) to execute all smart contracts. CKB-VM is based on the RISC-V CPU architecture, providing developers with the maximum amount of power and flexibility while maintaining a secure high-performance environment. This enables developers to use any crypto primitives they desire by simply providing a normal code library.

The code in this repository is for the backend server and the frontend code. The on-chain component is provided through a special [secp256r1 branch](https://github.com/lay2dev/pw-lock/tree/feature/secp256r1) of the PW-Lock smart contract that supports the NIST P-256 (secp256r1) algorithm needed by WebAuthn. This on-chain script executes at the application level, meaning any developer can develop and deploy a smart contract that uses the same functionality.

## Demo Instructions

The live demo is available for viewing at https://webauthn-demo.ckbdev.com.

> Note: You must be using a device, operating system, and browser that are capable of WebAuthn in order for this to work properly. This should work on most modern computers and devices, but some older devices may not have the necessary hardware.

Basic instructions for the demo:

- Open https://webauthn-demo.ckbdev.com in a browser.
- Register a new account and locate your CKB Address.
- Use the [Nervos Faucet](https://faucet.nervos.org/) to get some free testnet CKB.
- Wait for the faucet to send and for the CKB balance to update the demo. (This can sometimes take a few minutes.)
- Enter a testnet address in the field and click the "Send CKB" button. (You can send to your own address if you don't have a second address to send to.)

## How to Build and Run Locally

The instructions below are for developers who want to build and run the demo locally.

> Note: This is for demonstrative purposes only. The code is not production quality, and should not be considered for use to secure real funds on mainnet.

### Prerequisites
- Node.js v18.x (LTS)
- MongoDB

### Installing Node.js via NVM

If you do not have Node.js installed, we recommend using the [Node Version Manager (NVM)](https://github.com/nvm-sh/nvm) to install specific versions. Full installation instructions can be found on the [NVM GitHub](https://github.com/nvm-sh/nvm#installing-and-updating).

#### Quick Install Instructions for Linux

```sh
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
# After installing, you may need to log out and then log back in to the terminal.
nvm install v18
```

### Running MongoDB with Docker

If you do not have MongoDB installed and are using Docker, you can easily create a MongoDB instance using the following command.

```sh
docker run --name webauthn-mongo -d -p 27017:27017 mongo:latest
```

### Building

Before running the server, you will need to create a build. This will build and bundle all the needed files into `static/js/bundle.js` which is used by the web browser.

Running the build command is necessary any time changes are made to the source code. 

```sh
npm install
npm run build
```

### Running the Server

The commands below can be used to run the server on `localhost` using the default port of `3010`. These options can be configured in `config.json`.

```sh
npm install
npm run server
```

Once running, you can open the interface by opening a browser web to [http://localhost:3010](http://localhost:3010).

> Note: This demo will work properly on `localhost` and on `https` enabled domains. These are requirements of WebAuthn that cannot be circumvented. If you try to run this on a server IP address without `https` the demo will fail.
