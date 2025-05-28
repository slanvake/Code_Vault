'use strict';

let editor; // Monaco Editor instance
let currentFile = null; // Name of the currently loaded file

const LOCAL_STORAGE_PREFIX = 'codevault-';

// --- Google Drive API Configuration ---
// IMPORTANT: Replace 'YOUR_CLIENT_ID_FROM_GOOGLE_CLOUD' with your actual Client ID
const CLIENT_ID = '883086600239-a0lkinlblakt1tlv43pi8hi5286nm5t6.apps.googleusercontent.com'; // <<< Change this to your Client ID !!!
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'openid profile email https://www.googleapis.com/auth/drive.file';

let isGoogleAuthorized = false;
let googleAuthToken = null;
let gsiTokenClient; // For Google Identity Services token client


// Flags to track library loading
let gapiClientLoaded = false;
let gsiClientLoaded = false;

// Called when GAPI (Google API Client Library) script is loaded
window.onGapiClientLoad = function() {
  gapiClientLoaded = true;
  console.log("GAPI client library loaded.");
  tryAppInitialize();
};

// Called when GSI (Google Identity Services) script is loaded
window.onGsiClientLoad = function() {
  gsiClientLoaded = true;
  console.log("GSI client library loaded.");
  tryAppInitialize();
};

function tryAppInitialize() {
  // Check if both libraries are loaded
  if (gapiClientLoaded && gsiClientLoaded) {
    console.log("Both GAPI and GSI clients loaded. Initializing application components related to Google APIs.");

    // Initialize GSI token client (for authentication)
    // This client is used to request access tokens.
    gsiTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: handleCredentialResponse, // Callback function after token response
    });

    // Load the Google Drive API client library components
    // This uses the 'gapi' object which is now available.
    // 'client' refers to the core GAPI client library.
    // After this, initDriveClient will be called to set up Drive specific configurations.
    gapi.load('client', initDriveClient);

  } else {
    // Log if still waiting for one of the libraries
    if (!gapiClientLoaded) console.log("Waiting for GAPI client to load...");
    if (!gsiClientLoaded) console.log("Waiting for GSI client to load...");
  }
}



// Configure Monaco Editor loader
require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' } });
require(['vs/editor/editor.main'], function () {
  editor = monaco.editor.create(document.getElementById('editor'), {
    value: '// Welcome to Code Vault!\n' +
           '// Enter your code here or load a file from local storage.\n' +
           '// Authorize Google Drive to upload your files.\n' +
           '// This is an extended comment to make the initial code longer and demonstrate editor behavior.\n' +
           '// You can also add more lines of code here to fill up the editor space.\n' +
           '// For example, let\'s add a simple JavaScript function:\n\n' +
           'function calculateFactorial(n) {\n' +
           '  if (n === 0 || n === 1) {\n' +
           '    return 1;\n' +
           '  }\n' +
           '  let result = 1;\n' +
           '  for (let i = 2; i <= n; i++) {\n' +
           '    result *= i;\n' +
           '  }\n' +
           '  return result;\n' +
           '}\n\n' +
           '// And another one...\n' +
           'const greetUser = (name) => {\n' +
           '  console.log(`Hello, ${name}! Welcome to Code Vault.`);\n' +
           '  alert(`Hello, ${name}!`);\n' +
           '};\n\n' +
           '// You can call these functions later in your code\n' +
           '// console.log(calculateFactorial(5));\n' +
           '// greetUser(\'Monaco User\');\n\n' +
           '// Let\'s add some more filler content to make the scrollbar appear\n' +
           '// And extend horizontally as well to push the boundaries\n' +
           '// This line is intentionally very long to test horizontal scrolling and width filling capabilities of the editor instance. It\'s a good practice to ensure your editor handles long lines gracefully, even if you prefer to keep lines shorter in real coding.\n' +
           '// Keep adding more lines to fully cover the available vertical space.\n' +
           '// This example is for demonstration purposes only.\n' +
           '// In a real project, your code would naturally grow over time.\n' +
           '// Feel free to delete or modify this starter content as you develop your application.\n' +
           '// The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.\n' +
           '// The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.\n' +
           '// The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.\n' +
           '// The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.\n' +
           '// The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.\n' +
           '// The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.\n' +
           '// The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.\n' +
           '// This is the last line of the extended example for now. Enjoy coding in Code Vault!\n',
    language: 'javascript',
    theme: 'vs-dark', // ตรวจสอบให้แน่ใจว่าเป็น 'vs-dark' หรือ 'hc-black'
    automaticLayout: true
  });
  refreshFileList();
});

// --- Event Listeners for UI Buttons ---
// (ส่วนนี้เหมือนเดิม)
document.getElementById('saveBtn').addEventListener('click', saveFile);
document.getElementById('loadBtn').addEventListener('click', loadFile);
document.getElementById('deleteBtn').addEventListener('click', deleteFile);
document.getElementById('changeLangBtn').addEventListener('click', changeLanguage);
document.getElementById('downloadBtn').addEventListener('click', downloadFile);

document.getElementById('authorizeButton').addEventListener('click', handleAuthClick);
document.getElementById('uploadToDriveBtn').addEventListener('click', uploadToGoogleDrive);
document.getElementById('signOutButton').addEventListener('click', signOutFromGoogleDrive);


// --- Functions for Local Storage File Management ---
// (ส่วนนี้เหมือนเดิมทั้งหมด: saveFile, loadFile, deleteFile, changeLanguage, refreshFileList, getFilename, downloadFile)
function saveFile() {
  const name = getFilename();
  if (!name) {
    alert('Please enter a filename to save locally.');
    return;
  }
  const content = editor.getValue();
  const lang = editor.getModel().getLanguageId();
  localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${name}`, JSON.stringify({ content, lang }));
  currentFile = name;
  refreshFileList();
  alert(`File "${name}" saved to local storage.`);
}

function loadFile() {
  const name = getFilename();
  if (!name) {
    alert('Please enter a filename to load from local storage.');
    return;
  }
  const data = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${name}`);
  if (!data) {
    alert(`File "${name}" not found in local storage.`);
    return;
  }
  try {
    const file = JSON.parse(data);
    const model = monaco.editor.createModel(file.content, file.lang);
    editor.setModel(model);
    currentFile = name;
    document.getElementById('language').value = file.lang;
    refreshFileList();
    alert(`File "${name}" loaded from local storage.`);
  } catch (e) {
    console.error("Error parsing file data from local storage:", e);
    alert(`Error loading file "${name}": Data might be corrupted.`);
  }
}

function deleteFile() {
  const name = getFilename();
  if (!name) {
    alert('Please enter a filename to delete from local storage.');
    return;
  }
  if (!localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${name}`)) {
    alert(`File "${name}" not found in local storage.`);
    return;
  }
  if (confirm(`Are you sure you want to delete "${name}" from local storage?`)) {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${name}`);
    if (currentFile === name) {
      editor.setValue('');
      currentFile = null;
      document.getElementById('filename').value = '';
    }
    refreshFileList();
    alert(`File "${name}" deleted from local storage.`);
  }
}

function changeLanguage() {
  const lang = document.getElementById('language').value;
  const content = editor.getValue();
  const model = monaco.editor.createModel(content, lang);
  editor.setModel(model);
  alert(`Language changed to ${lang}.`);
}

function refreshFileList() {
  const list = document.getElementById('file-list');
  list.innerHTML = '';

  Object.keys(localStorage)
    .filter(key => key.startsWith(LOCAL_STORAGE_PREFIX))
    .forEach(key => {
      const name = key.replace(LOCAL_STORAGE_PREFIX, '');
      const itemDiv = document.createElement('div');
      itemDiv.className = 'file-item';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = name;
      if (name === currentFile) {
        nameSpan.classList.add('active');
      }

      const openButton = document.createElement('button');
      openButton.textContent = 'Open';
      openButton.addEventListener('click', () => {
        document.getElementById('filename').value = name;
        loadFile();
      });

      itemDiv.appendChild(nameSpan);
      itemDiv.appendChild(openButton);
      list.appendChild(itemDiv);
    });
}

function getFilename() {
  return document.getElementById('filename').value.trim();
}

function downloadFile() {
  const name = getFilename() || 'untitled';
  const content = editor.getValue();
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert(`File "${name}.txt" prepared for download.`);
}


// --- Functions for Google Identity Services (GSI) and Drive API ---
// (initDriveClient, handleCredentialResponse, handleAuthClick, signOutFromGoogleDrive, updateSigninStatus, uploadToGoogleDrive เหมือนเดิม)
function initDriveClient() {
  // This function is now called after `gapi.load('client', ...)` in tryAppInitialize completes.
  // It initializes the GAPI client for the Google Drive service.
  gapi.client.init({
    discoveryDocs: DISCOVERY_DOCS,
    // No need to set clientId/scope here when using GSI's token model for authorization.
    // The access token will be set by gapi.client.setToken() later.
  }).then(function () {
    updateSigninStatus(isGoogleAuthorized); // Update UI based on any existing auth state
    document.getElementById('auth-status').textContent = 'Google Drive: Ready for Authorization';
    console.log("Google Drive API client initialized (via gapi.client.init).");
  }, function(error) {
    console.error('Error initializing Google Drive API client:', error);
    document.getElementById('auth-status').textContent = 'Google Drive: Drive client init failed';
    updateSigninStatus(false);
  });
}

function handleCredentialResponse(response) {
  if (response.error) {
    console.error('Google authorization error:', response.error, response.error_description);
    alert('Google Drive authorization failed: ' + (response.error_description || response.error));
    updateSigninStatus(false);
    return;
  }
  if (response.access_token) {
    googleAuthToken = response.access_token;
    gapi.client.setToken({ access_token: googleAuthToken }); // Set the token for GAPI calls
    alert('Google Drive authorized successfully!');
    updateSigninStatus(true);
  }
}

function handleAuthClick() {
  if (gsiTokenClient) {
    gsiTokenClient.requestAccessToken();
  } else {
    console.error("GSI Token Client not initialized. Libraries might not be fully loaded yet.");
    alert("Google Authentication components are not ready. Please wait a moment and try again.");
  }
}

function signOutFromGoogleDrive() {
  if (googleAuthToken) {
    google.accounts.oauth2.revoke(googleAuthToken, () => {
      googleAuthToken = null;
      if (gapi && gapi.client) { // Check if gapi.client is available
          gapi.client.setToken(null); // Clear token from gapi client
      }
      alert('You have been signed out from Google Drive.');
      updateSigninStatus(false);
      console.log('Token revoked and user signed out.');
    });
  } else {
    updateSigninStatus(false); // Already signed out or token missing
  }
}

function updateSigninStatus(isSignedIn) {
  isGoogleAuthorized = isSignedIn;
  const authButton = document.getElementById('authorizeButton');
  const uploadButton = document.getElementById('uploadToDriveBtn');
  const signOutButton = document.getElementById('signOutButton');
  const authStatus = document.getElementById('auth-status');

  if (isSignedIn) {
    authButton.style.display = 'none';
    uploadButton.style.display = 'block';
    signOutButton.style.display = 'block';
    authStatus.textContent = 'Google Drive: Authorized';
  } else {
    authButton.style.display = 'block';
    uploadButton.style.display = 'none';
    signOutButton.style.display = 'none';
    authStatus.textContent = 'Google Drive: Not authorized';
    googleAuthToken = null;
  }
}

function uploadToGoogleDrive() {
  if (!isGoogleAuthorized || !googleAuthToken) {
    alert('Please authorize Google Drive first.');
    return;
  }

  const name = getFilename();
  if (!name) {
    alert('Please enter a filename to upload to Google Drive.');
    return;
  }
  const content = editor.getValue();
  console.log("Content from editor (raw):", content);
  console.log("Length of content:", content.length);

  if (!content) {
      alert('Editor content is empty. Please enter some code before uploading.');
      return;
  }

  const actualMimeType = 'text/plain';
  const fileExtension = '.txt';
  const fullFileName = `${name}${fileExtension}`;

  const fileContent = new Blob([content], { type: actualMimeType });
  console.log("Blob created:", fileContent);
  console.log("Blob size (bytes):", fileContent.size);
  console.log("Blob type:", fileContent.type);

  const fileMetadata = {
    'name': fullFileName,
    'mimeType': actualMimeType
  };

  // --- เริ่มส่วนการส่งด้วย XMLHttpRequest โดยตรง ---
  // นี่คือ URL สำหรับ Drive API files.create method
  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const boundary = 'foo_bar_baz'; // กำหนด boundary สำหรับ multipart request

  const metadata = JSON.stringify(fileMetadata);

  // สร้าง body ของ request ในรูปแบบ multipart/related
  const body = `\r\n--${boundary}\r\n` +
               `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
               `${metadata}\r\n` +
               `--${boundary}\r\n` +
               `Content-Type: ${actualMimeType}\r\n\r\n`;

  // สร้าง Blob สำหรับ body ทั้งหมด
  // เนื่องจาก Blob ไม่สามารถ concatenates ได้ตรงๆ เราจะใช้วิธีสร้าง Array ของ Blob/string
  const combinedBlob = new Blob([
      body,
      fileContent, // เนื้อหาไฟล์ของเราที่เป็น Blob
      `\r\n--${boundary}--` // ปิดท้าย multipart
  ], { type: `multipart/related; boundary="${boundary}"` });


  const xhr = new XMLHttpRequest();
  xhr.open('POST', uploadUrl);
  xhr.setRequestHeader('Authorization', `Bearer ${googleAuthToken}`);
  xhr.setRequestHeader('Content-Type', `multipart/related; boundary="${boundary}"`); // ตั้ง Content-Type ของ request ทั้งหมด

  xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 300) {
      const response = JSON.parse(xhr.responseText);
      alert(`File "${response.name}" uploaded to Google Drive via XHR! File ID: ${response.id}`);
      console.log('Google Drive File (XHR response):', response);
    } else {
      alert('Error uploading file to Google Drive via XHR. Check console for details.');
      console.error('Google Drive Upload Error (XHR):', xhr.status, xhr.statusText, xhr.responseText);
    }
  };

  xhr.onerror = function () {
    console.error('Network error or XHR failed to send.');
    alert('Network error during Google Drive upload. Check console.');
  };

  xhr.send(combinedBlob); // ส่ง Blob ที่รวมเนื้อหาทั้งหมดไป


  // --- สิ้นสุดส่วนการส่งด้วย XMLHttpRequest โดยตรง ---
  // สามารถลบโค้ด gapi.client.drive.files.create เก่าออกไปได้ หรือ comment ไว้
  /*
  gapi.client.drive.files.create({
    resource: fileMetadata,
    media: {
      mimeType: actualMimeType,
      body: fileContent
    },
    fields: 'id, name, webViewLink'
  }).then(function(response) {
    if (response && response.result && response.result.id) {
      alert(`File "${response.result.name}" uploaded to Google Drive! File ID: ${response.result.id}`);
      console.log('Google Drive File (parsed result):', response.result);
    } else {
      alert('Error uploading file to Google Drive. Check console for details (response).');
      console.error('Google Drive Upload Error (response):', response);
    }
  }, function(error) {
    alert('Error uploading file to Google Drive. Check console for details (gapi error).');
    console.error('Google Drive Upload Error (gapi error):', error);
    if (error.result && error.result.error && error.result.error.message === "Invalid Credentials" && error.result.error.status === "UNAUTHENTICATED") {
        signOutFromGoogleDrive();
        alert("Your Google Drive session may have expired. Please authorize again.");
    }
  });
  */
}
