const { getMakeCredentialsChallenge, sendWebAuthnResponse, getGetAssertionChallenge } = require('./webauthn.auth')
const { publicKeyCredentialToJSON, preformatGetAssertReq, preformatMakeCredReq } = require('./helpers')
const arrayBufferToHex = require('array-buffer-to-hex')
const { addressFromPubKey, getBalance, sendCKB, initializeLumosConfig } = require('./ckb')

/**
 * Switch to login page
 */
$('#toLogin').click(function (e) {
  e.preventDefault()
  $('#registerContainer').hide()
  $('#loginContainer').show()
})

const scheduleJobList = [];
const timeOutFunc = () => {
  for(const func of scheduleJobList){
    func();
  }
  setTimeout(timeOutFunc, 10 * 1000)
}
timeOutFunc();

/**
 * Switch to registration page
 */
$('#toRegistration').click(function (e) {
  e.preventDefault()
  $('#loginContainer').hide()
  $('#registerContainer').show()
})

let loadMainContainer = () => {
  return fetch('/personalInfo', { credentials: 'include' })
    .then((response) => response.json())
    .then((response) => {
      if (response.status === 'ok') {
        $('#name').html(response.name)
        $('#registerContainer').hide()
        $('#loginContainer').hide()
        $('#mainContainer').show()

        const pubKey = '0x' + localStorage.getItem('publicKey')
        const address = addressFromPubKey(pubKey)
        $('#address').html(address)

        const balanceFunc = async () => {
          await getBalance(pubKey).then((balance) => {
            $('#balance').html(balance + '')
          })
        }
        balanceFunc();

        if(!scheduleJobList.includes(balanceFunc)){
           scheduleJobList.push(balanceFunc);
        }
      } else {
        alert(`Error! ${response.message}`)
      }
    })
}

let checkIfLoggedIn = () => {
  return fetch('/isLoggedIn', { credentials: 'include' })
    .then((response) => response.json())
    .then((response) => {
      if (response.status === 'ok') {
        return true
      } else {
        return false
      }
    })
}

$('#logoutButton').click(() => {
  fetch('/logout', { credentials: 'include' })

  localStorage.setItem('publicKey', '')

  $('#registerContainer').hide()
  $('#mainContainer').hide()
  $('#loginContainer').show()
  scheduleJobList.splice(0,scheduleJobList.length);
})

/* Handle for register form submission */
$('#register').submit(function (event) {
  event.preventDefault()

  let username = this.username.value
  // let name = this.name.value
  let name = username;

  if (!username || !name) {
    alert('Name or username is missing!')
    return
  }

  getMakeCredentialsChallenge({ username, name })
    .then((response) => {
      console.log('request register success')
      let publicKey = preformatMakeCredReq(response)
      publicKey.attestation = 'none'
      console.log('navigator.credentials.create: ', { publicKey })
      return navigator.credentials.create({ publicKey })
    })
    .then((response) => {
      console.log('web auth create success')
      let makeCredResponse = publicKeyCredentialToJSON(response)
      console.log('makeCredResponse', makeCredResponse)
      return sendWebAuthnResponse(makeCredResponse)
    })
    .then((response) => {
      if (response.status === 'ok') {
        let { authrInfo } = response.data
        console.log('authrInfo', authrInfo)
        let publicKey = base64url.decode(authrInfo.publicKey)
        console.log('publicKey', arrayBufferToHex(publicKey))
        localStorage.setItem('publicKey', arrayBufferToHex(publicKey).slice(2))
        localStorage.setItem('credID', authrInfo.credID)

        loadMainContainer()
      } else {
        alert(`Server responed with error. The message is: ${response.message}`)
      }
    })
    .catch((error) => alert(error))
})

/* Handle for login form submission */
$('#login').submit(function (event) {
  event.preventDefault()

  let username = this.username.value

  if (!username) {
    alert('Username is missing!')
    return
  }

  getGetAssertionChallenge({ username })
    .then((response) => {
      console.log('LOGIN1', response)
      let publicKey = preformatGetAssertReq(response)
      console.log('login pubkey', publicKey)
      return navigator.credentials.get({ publicKey })
    })
    .then((response) => {
      console.log()
      let getAssertionResponse = publicKeyCredentialToJSON(response)
      console.log('getAssertionResponse', getAssertionResponse)
      return sendWebAuthnResponse(getAssertionResponse)
    })
    .then((response) => {
      console.log('LOGIN2', response)
      if (response.status === 'ok') {
        let { authrInfo } = response.data
        console.log('authrInfo', authrInfo)
        let publicKey = base64url.decode(authrInfo.publicKey)
        console.log('publicKey', arrayBufferToHex(publicKey))
        localStorage.setItem('publicKey', arrayBufferToHex(publicKey).slice(2))
        localStorage.setItem('credID', authrInfo.credID)

        loadMainContainer()
      } else {
        alert(`Server responed with error. The message is: ${response.message}`)
      }
    })
    .catch((error) => alert(error))
})

$('#sendCKB').click(function (event) {
  event.preventDefault()
  const pubKey = '0x' + localStorage.getItem('publicKey')
  console.log('start sendCKB')
  const oldValue = $('#balance').text().replace(/\D/g,'')
  console.log('parsed balance ' + oldValue)

  const toAddress = $('#toAddress').val();

  if(!toAddress || !toAddress.trim().startsWith("ckt")){
    alert('please input correct CKB testnet address');
    return;
  }

  if (parseFloat(oldValue) > 200) {
    sendCKB(pubKey, toAddress)
      .then((txHash) => {
        $('#balance').html(oldValue + '...')
        $('#transactions').show()
        $('#transaction-link').html(`TX Hash: <a href="https://pudge.explorer.nervos.org/transaction/${txHash}" target="_blank">${txHash}</a>`)
        alert('Send successful!')
      })
      // .catch((err) => {
      //   alert(err)
      // })
  } else {
    alert('CKB balance is too low to send.')
  }
})

$(document).ready(() => {
  initializeLumosConfig()
  checkIfLoggedIn().then((response) => {
    if (response) return loadMainContainer()
  })
})
