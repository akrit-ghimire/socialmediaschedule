import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, list } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebase_config = {
    apiKey: "AIzaSyDRoAFHFHjUpLYi2pU3QrLtImcbxCBmbTQ",
    authDomain: "socialmediaschedule-f833e.firebaseapp.com",
    projectId: "socialmediaschedule-f833e",
    storageBucket: "socialmediaschedule-f833e.appspot.com",
    messagingSenderId: "362494016797",
    appId: "1:362494016797:web:decfbdabd7d109a04235f4"
};

const firebase = initializeApp(firebase_config);
const storage = getStorage(firebase);
export const storage_ref = ref(storage);

export function get_ref(filepath) {
    return ref(storage_ref, filepath);
}

export function upload_file_to_firebase(file_storage_ref, file, resolve, reject) {
    const network_error_message = "No internet connection. Please check your network and try again.";

    if (!navigator.onLine) return reject(network_error_message); // initial status

    const handle_offline = () => { reject(network_error_message); };
    window.addEventListener('offline', handle_offline); // listen for offline

    uploadBytes(file_storage_ref, file)
        .then(result => {
            window.removeEventListener('offline', handle_offline); // cleanup code
            resolve();
        })
        .catch(error => {
            window.removeEventListener('offline', handle_offline);

            if (error.message.includes("ERR_INTERNET_DISCONNECTED")) reject(network_error_message);
            else {
                console.log(error);
                reject("Failed to upload files.");
            }
        });
}

export function get_file_url(file_storage_ref, resolve, reject) {
    getDownloadURL(file_storage_ref)
        .then(url => {
            resolve(url)
        })
        .catch(error => {
            reject("Failed to get file URL.");
        });
}

export function delete_file_from_firebase(file_storage_ref, resolve, reject) {
    deleteObject(file_storage_ref)
        .then(() => {
            resolve("File deleted successfully.");
        })
        .catch(error => {
            console.log(error);
            reject("Failed to delete file.");
        });
}

async function list_dir(path = '', next_page_token = null) {
    const dirpath = get_ref(path)

    const page = await list(dirpath, { maxResults: 100, pageToken: next_page_token });
    let next_page = []
    if (page.nextPageToken) next_page = await list_dir(path, page.nextPageToken) // 1 level recursion
    if (next_page.length > 0) next_page = next_page[0]

    if (page.prefixes.length > 0) return [[...page.prefixes, ...next_page], 'DIR'] // check this l8tr
    else return [[...page.items, ...next_page], 'FILE']
}

function format_list_obj(path, type) {
    return {
        path: path.fullPath,
        type,
        children: []
    }
}

export async function get_app_storage(path='') {
    const storage = []
    const [dirs, type] = await list_dir(path)
    
    for (let i = 0; i < dirs.length; i++) {
        const dir = dirs[i];
        const dir_obj = format_list_obj(dir, type)
        if (type == 'DIR') dir_obj.children = await get_app_storage(dir.fullPath)
        storage.push(dir_obj)
    }
    return storage
}

