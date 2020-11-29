const { getMakeCredentialsChallenge, sendWebAuthnResponse, getGetAssertionChallenge } = require('./webauthn.auth')
const { publicKeyCredentialToJSON, preformatGetAssertReq, preformatMakeCredReq } = require('./helpers')
const arrayBufferToHex = require('array-buffer-to-hex')
const { addressFromPubKey, getBalance, sendCKB } = require('./ckb')

/**
 * Switch to login page
 */
$('#toLogin').click(function (e) {
  e.preventDefault()
  $('#registerContainer').hide()
  $('#loginContainer').show()
})

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
        $('#theSecret').html(response.theSecret)
        $('#name').html(response.name)
        $('#registerContainer').hide()
        $('#loginContainer').hide()
        $('#mainContainer').show()

        const pubKey = '0x' + localStorage.getItem('publicKey')
        const address = addressFromPubKey(pubKey)
        $('#address').html(address)

        const balanceFunc = () => {
          getBalance(pubKey).then((balance) => {
            $('#balance').html(balance + '')
          })
        }

        const timeOutFunc = () => {
          balanceFunc()
          setTimeout(timeOutFunc, 2000)
        }

        timeOutFunc()
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
  const oldValue = $('#balance').html()
  if (parseFloat(oldValue) > 200) {
    sendCKB(pubKey)
      .then((txHash) => {
        $('#balance').html(oldValue + '...')
        alert('send Success, txHash=' + txHash)
      })
      .catch((err) => {
        alert(err)
      })
  } else {
    alert('balance not enough')
  }
})

$(document).ready(() => {
  checkIfLoggedIn().then((response) => {
    if (response) return loadMainContainer()
  })
})
