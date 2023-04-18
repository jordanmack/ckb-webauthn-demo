const base = require('@ckb-lumos/base');
const { computeScriptHash } = base.utils;

const CKB_NODE_URL = 'https://testnet.ckb.dev';
const CKB_INDEXER_NODE_URL = 'https://testnet.ckb.dev';
const BLOCK_ASSEMBLER_CODE = '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8';
const MULTISIG_TYPE_ID = '0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8';
const r1Type = {
  codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
  hashType: 'type',
  args: '0xb1ddc954094e1fd2cc39414a620ccf1c84987a5514c3ba99a524af7e15126df5'
};
const r1TypeId = computeScriptHash(r1Type);
const secp256R1LockCell = {
  type: r1Type,
  lock: {
    codeHash: BLOCK_ASSEMBLER_CODE,
    hashType: 'type',
    args: '0xca911d8850e55caabe27c1fbf90b522db10774bc',
  },
  capacity: 70000 * 10 ** 8,
  outPoint: {
    txHash: '0x9687ac5e311d009df1505459afc83a55c46496eb292fc11e4f6c24df5dfd4de5',
    index: '0x0',
  },
};
const secp256k1Dep = {
  hashType: 'type',
  codeHash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
  outPoint: {
    txHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
    index: '0x0',
  },
}

module.exports = {
  CKB_NODE_URL,
  CKB_INDEXER_NODE_URL,
  secp256k1Dep,
  BLOCK_ASSEMBLER_CODE,
  MULTISIG_TYPE_ID,
  r1TypeId,
  secp256R1LockCell
};
