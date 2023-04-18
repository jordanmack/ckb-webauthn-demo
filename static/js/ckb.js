const lumosBase = require('@ckb-lumos/base');
const lumosLumos = require('@ckb-lumos/lumos');
const { bytes, number } = require('@ckb-lumos/codec');
const { initializeConfig, predefined } = require('@ckb-lumos/config-manager');
const { addressToScript, encodeToAddress, TransactionSkeleton, createTransactionFromSkeleton } = require('@ckb-lumos/helpers');
const { CellCollector, Indexer } = require('@ckb-lumos/ckb-indexer');
const { RPC } = lumosLumos;
const rawTransactionPack = lumosBase.blockchain.RawTransaction.pack;
const witnessArgsPack = lumosBase.blockchain.WitnessArgs.pack;
const { ckbHash } = lumosBase.utils;
const arrayBufferToHex = require('array-buffer-to-hex')
const { hexToBytes, padRight, padLeft } = require('web3-utils')
const { createHash } = require('crypto')
const { parseGetAssertAuthData } = require('./helpers')
const { CKB_NODE_URL, CKB_INDEXER_NODE_URL, r1TypeId, secp256R1LockCell } = require('./ckb_config_aggron')

const ckb = new RPC(CKB_NODE_URL)
const ckbIndexer = new Indexer(CKB_INDEXER_NODE_URL, CKB_NODE_URL);
const R1_WITNESS_LEN = 1128;

function pubKeyToLockArg(pubKey){
  console.log('pubKey', pubKey);
  const arg =
    "0x" +
    hash(Buffer.from(pubKey.replace("0x", ""), "hex"))
      .toString("hex")
      .substr(0, 40);
  return arg;
}

function addressFromPubKey(pubKey) {
  const script = {
    codeHash: r1TypeId,
    hashType: 'type',
    args: pubKeyToLockArg(pubKey)
  };
  return encodeToAddress(script);
}

async function collectBalance(lockScript)
{
	const query = {lock: lockScript, type: "empty"};
	const cellCollector = new CellCollector(ckbIndexer, query);

	let inputCapacity = 0n;

	for await (const cell of cellCollector.collect())
		inputCapacity += BigInt(cell.cellOutput.capacity);

	return inputCapacity;
}

async function collectCapacity(lockScript, capacityRequired)
{
	const query = {lock: lockScript, type: "empty"};
	const cellCollector = new CellCollector(ckbIndexer, query);

	let inputCells = [];
	let inputCapacity = 0n;

	for await (const cell of cellCollector.collect())
	{
		inputCells.push(cell);
		inputCapacity += BigInt(cell.cellOutput.capacity);

		if(inputCapacity >= capacityRequired)
			break;
	}

	if(inputCapacity < capacityRequired)
		throw new Error("Unable to collect enough cells to fulfill the capacity requirements.");

	return {inputCells, inputCapacity};
}

async function getBalance(pubKey) {
  const lockScript = {
    codeHash: r1TypeId,
    hashType: 'type',
    args: pubKeyToLockArg(pubKey),
  };

  const balance = Number(await collectBalance(lockScript));
  console.log('balance', balance)

  const balanceStr = Number(balance / 10 ** 8).toLocaleString();
  console.log("balanceStr", balanceStr)

  return balanceStr
}

async function buildR1Tx(r1PubKey, toAddress, amountToSend) {
  const txFee = 100_000n // Fee is 100,000 Shannons. 1 CKB = 100,000,000 Shannons.

  // This is the lock script we are sending from, and will also get the change from the transaction.
  const inputLockScript = {
    codeHash: r1TypeId,
    hashType: 'type',
    args: pubKeyToLockArg(r1PubKey),
  }
  console.log('inputLockScript', inputLockScript);
  
  // Create a transaction skeleton.
  let txSkeleton = TransactionSkeleton();

  // Add the cell dep for the secp256r1 lock script.
	txSkeleton = txSkeleton.update("cellDeps", (cellDeps)=>cellDeps.push({ outPoint: secp256R1LockCell.outPoint, depType: 'code' }));

  // Collect and add the required capacity to the transaction.
  const ckbRequired = ((BigInt(amountToSend) + 61n) * BigInt(10**8)) + txFee // CKBytes required: Capacity required + 61 for a change cell + 100,000 shannons as the tx fee.
  console.log("ckbRequired", ckbRequired)
  const inputCells = (await collectCapacity(inputLockScript, ckbRequired)).inputCells
  console.log("inputCells", inputCells)
  txSkeleton = txSkeleton.update("inputs", (i)=>i.concat(inputCells));

  // Create an output cell to the destination address for the exact amount of CKB being sent.
  const output = {cellOutput: {capacity: `0x${BigInt(BigInt(amountToSend) * BigInt(10**8)).toString(16)}`, lock: addressToScript(toAddress), type: null}, data: "0x"};
  txSkeleton = txSkeleton.update("outputs", (i)=>i.push(output));

	// Determine the capacity of all input cells and output cells.
	const inputCapacity = txSkeleton.inputs.toArray().reduce((a, c)=>a+BigInt(c.cellOutput.capacity), 0n);
	const outputCapacity = txSkeleton.outputs.toArray().reduce((a, c)=>a+BigInt(c.cellOutput.capacity), 0n);
  console.log("inputCapacity/outputCapacity", inputCapacity, outputCapacity)

	// Create a change Cell for the remaining CKBytes.
	const changeCapacity = BigInt(inputCapacity - outputCapacity - txFee).toString(16);
	let change = {cellOutput: {capacity: `0x${changeCapacity}`, lock: inputLockScript, type: null}, data: "0x"};
	txSkeleton = txSkeleton.update("outputs", (i)=>i.push(change));

  // Setup empty witness structure with witnesses[0] being populated with an empty WitnessArgs structure.
  txSkeleton = txSkeleton.update("witnesses", ()=>txSkeleton.inputs.map(() => '0x'))
  txSkeleton = txSkeleton.update("witnesses", (i)=>i.splice(0, 1, { lock: '0x', inputType: '0x', outputType: '0x' }));
  
  console.log("txSkeleton", txSkeleton.toJS())

  return txSkeleton
}

function hash(data) {
  return createHash('SHA256').update(data).digest()
}

ArrayBuffer.prototype.toBuffer = function () {
  const hex = arrayBufferToHex(this)
  return Buffer.from(hex.replace('0x', ''), 'hex')
}

function extractRSFromSignature(signature) {
  const rlen = signature[3]
  const slen = signature[3 + rlen + 2]
  console.log('r,s len', rlen, slen)

  const rHex = padLeft(signature.slice(4, 4 + rlen).toString('hex'), 64, '0')
  const sHex = padLeft(signature.slice(3 + rlen + 2 + 1).toString('hex'), 64, '0')

  console.log('r', rHex)
  console.log('s', sHex)
  const r = Buffer.from(rHex, 'hex')
  const s = Buffer.from(sHex, 'hex')

  return { r: r.slice(-32), s: s.slice(-32) }
}

function serializeWitnessArgs(witness) {
  return bytes.hexify(witnessArgsPack(witness))
}

function toUint64Le(hex) {
  return bytes.hexify(number.Uint64LE.pack(hex))
}

async function signR1Tx(txSkeleton, pubKey) {
  // Zero-fill the lock key of the witnesses in preparation for generating a tx hash.
  const zeroFilledWitness = txSkeleton.witnesses.get(0)
  zeroFilledWitness.lock = '0x' + '0'.repeat(R1_WITNESS_LEN)
  txSkeleton = txSkeleton.update("witnesses", (i)=>i.splice(0, 1, serializeWitnessArgs(zeroFilledWitness)));

  // Convert from a tx skeleton to a tx.
  let tx = createTransactionFromSkeleton(txSkeleton)
  console.log('tx', tx)

  // Calculate the hash of the packed tx structure.
  const txHash = ckbHash(rawTransactionPack(tx))
  console.log('txHash', txHash)

  // Determine the size of the witness when packed to bytes.
  const serializedEmptyWitnessBytes = hexToBytes(serializeWitnessArgs(zeroFilledWitness))
  const serialziedEmptyWitnessSize = serializedEmptyWitnessBytes.length
  console.log('serialziedEmptyWitnessSize', serialziedEmptyWitnessSize)

  // Calculate keccak256 hash for the tx + witnesses.
  const sha256Hasher = createHash('SHA256')
  sha256Hasher.update(Buffer.from(txHash.replace('0x', ''), 'hex'))
  sha256Hasher.update(Buffer.from(toUint64Le(`0x${serialziedEmptyWitnessSize.toString(16)}`).replace('0x', ''), 'hex'))
  sha256Hasher.update(Buffer.from(serializedEmptyWitnessBytes))

  // Add remaining witnesses to hash.
  txSkeleton.witnesses.toJS().slice(1).forEach((w) => {
    const bytes = hexToBytes(typeof w === 'string' ? w : serializeWitnessArgs(w))
    sha256Hasher.update(Buffer.from(toUint64Le(`0x${bytes.length.toString(16)}`).replace('0x', ''), 'hex'))
    sha256Hasher.update(Buffer.from(bytes))
  })

  // Generate the challenge.
  let challenge = sha256Hasher.digest()
  console.log('challenge', challenge)

  let credID = localStorage.getItem('credID')
  const credIDBuffer = base64url.decode(credID)
  console.log('credID', credID)
  
  let webauthnPubKey = {
    challenge,
    allowCredentials: [
      {
        id: credIDBuffer,
        transports: ['usb', 'nfc', 'ble', 'internal'],
        type: 'public-key',
      },
    ],
  }

  const webauthnResult = await navigator.credentials.get({ publicKey: webauthnPubKey })
  console.log('webauthResult', webauthnResult)
  const { signature, clientDataJSON, authenticatorData } = webauthnResult.response
  console.log('signature', arrayBufferToHex(signature))
  console.log('clientDataJSON', arrayBufferToHex(clientDataJSON))
  const utf8Decoder = new TextDecoder('utf-8')
  const decodedClientData = utf8Decoder.decode(clientDataJSON)
  const clientDataObj = JSON.parse(decodedClientData)
  console.log('clientDataObj', clientDataObj)

  let authrDataStruct = parseGetAssertAuthData(authenticatorData)
  console.log('authrDataStruct', authrDataStruct)

  const { r, s } = extractRSFromSignature(signature.toBuffer())
  const rsSignature = Buffer.concat([r, s])

  const authrData = Buffer.concat([
    authrDataStruct.rpIdHash.toBuffer(),
    authrDataStruct.flagsBuf.toBuffer(),
    authrDataStruct.counterBuf.toBuffer(),
  ])

  console.log('signature', rsSignature.toString('hex'))
  console.log('authrData', authrData.toString('hex'))

  const pubKeyBuffer = Buffer.from(pubKey.replace('0x', ''), 'hex');
  const lockBuffer = Buffer.concat([pubKeyBuffer, rsSignature, authrData, clientDataJSON.toBuffer()])

  // Copy lockBuffer signature into a new witness entry.
  let newWitness = { ...zeroFilledWitness };
  newWitness.lock = '0x' + padRight(lockBuffer.toString('hex'), R1_WITNESS_LEN, '0')
  console.log('newWitness', newWitness)

  // Add the new witness as witnesses[0] to create the signedTx.
  const signedWitnesses = [serializeWitnessArgs(newWitness), ...txSkeleton.witnesses.slice(1)]
  const signedTx = {
    ...tx,
    witnesses: signedWitnesses.map((witness) =>
      typeof witness === 'string' ? witness : serializeWitnessArgs(witness)
    ),
  }

  return signedTx
}

async function sendCKB(pubKey, toAddress) {
  console.log('start send CKB to ', pubKey)
  const tx = await buildR1Tx(pubKey, toAddress, 100)
  const signedTx = await signR1Tx(tx, pubKey)
  console.log('signedTx', signedTx)

  try {
    const realTxHash = await ckb.sendTransaction(signedTx)
    console.log(`The real transaction hash is: ${realTxHash}`)

    return realTxHash
  } catch (err) {
    console.log('send error', err)
    throw err
  }
}

function initializeLumosConfig()
{
  initializeConfig(predefined.AGGRON4)
}

module.exports = {
  addressFromPubKey,
  getBalance,
  sendCKB,
  initializeLumosConfig
}
