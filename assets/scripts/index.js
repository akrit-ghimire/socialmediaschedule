import { get_ref, upload_file_to_firebase } from './module.js'

const API_URL = "https://stav.frances.cz/"
const IS_VALID_JOB_API = (order_id) => API_URL + `isvalidjob?jobId=${order_id}`

const get = (elem, source = document) => source.querySelector(elem)

const app = {
    data: {
        uuid: 0,
        get_uuid: () => {
            app.data.uuid++
            return app.data.uuid
        },

        photos: []
    },
    pages: {
        LOADING_PAGE: get('#LOADING_PAGE'),
        FORM_PAGE: get('#FORM_PAGE'),
        ERROR_PAGE: get('#ERROR_PAGE'),
        SUCCESS_PAGE: get('#SUCCESS_PAGE')
    },
    error: {
        ORDER_ERROR: get('#ORDER_ERROR'),
        PHOTO_ERROR: get('#PHOTO_ERROR'),
        hide_all: () => {
            app.error.ORDER_ERROR.classList.add('hidden')
            app.error.PHOTO_ERROR.classList.add('hidden')
        },
        show_order: (message) => {
            app.error.ORDER_ERROR.classList.remove('hidden')
            app.error.ORDER_ERROR.innerText = message
        },
        show_photo: (message) => {
            app.error.PHOTO_ERROR.classList.remove('hidden')
            app.error.PHOTO_ERROR.innerText = message
        }
    },
    buttons: {
        SUBMIT: get('#SUBMIT'),
        SUBMIT_ANOTHER: get('#SUBMIT_ANOTHER'),
        SUBMIT_AGAIN: get('#SUBMIT_AGAIN'),
    },
    elements: {
        ORDER_INPUT: get('#ORDER_ID_INPUT'),
        PHOTO_GALLERY: get('#PHOTO_GALLERY'),
        UPLOAD_PHOTO: get('#UPLOAD_BOX'),
        PHOTO_GALLERY_COUNT: get('#PHOTO_GALLERY_COUNT'),
        FORM_ELEMENT: get('#FORM_ELEM'),
        LOADING_TEXT: get('#LOADING_TEXT'),
        SUCCESS_MESSAGE: get('#SUCCESS_MESSAGE'),
        ERROR_MESSAGE: get('#ERROR_MESSAGE'),
        create_photo_box: (img_src, photo_id, delete_callback) => {
            // <div class="photo_box">
            //     <div class="delete_button">
            //         <img src="./assets/icons/trash.svg" alt="">
            //     </div>
            //     <img src="" alt="">
            // </div>
            const photo_box = document.createElement('div')
            photo_box.classList.add('photo_box')

            const delete_button = document.createElement('div')
            delete_button.classList.add('delete_button')
            delete_button.innerHTML = '<img src="./assets/icons/trash.svg">'
            delete_button.onclick = () => { delete_callback(photo_id) }

            const image = document.createElement('img')
            image.src = img_src
            image.classList.add('main_img')

            image.onclick = () => { app.elements.display_modal(img_src) }

            photo_box.appendChild(delete_button)
            photo_box.appendChild(image)

            return photo_box
        },
        update_gallery_count: () => {
            app.elements.PHOTO_GALLERY_COUNT.innerText = "(" + app.data.photos.length + ")"
        },
        update_gallery: () => {
            // remove photo error
            app.error.PHOTO_ERROR.classList.add('hidden')

            const remove_photos = app.elements.PHOTO_GALLERY.querySelectorAll('.photo_box');
            remove_photos.forEach(photo => photo.remove());

            app.elements.update_gallery_count()

            const delete_callback = (photo_id) => {
                app.data.photos = app.data.photos.filter(photo => photo.id !== photo_id); // remove photo by filtering it out
                app.elements.update_gallery()
            }

            app.data.photos.forEach(photo => {
                const photo_box = app.elements.create_photo_box(photo.src, photo.id, delete_callback)
                app.elements.PHOTO_GALLERY.insertBefore(photo_box, app.elements.PHOTO_GALLERY.firstChild)
            })
        },
        display_modal: (image_src) => {
            // <div class="modal">
            //     <div class="close_button">
            //         <img src="./assets/icons/close.svg">
            //     </div>
            //     <img class="main" src="">
            // </div>
            const modal = document.createElement('div')
            modal.classList.add('modal')
            
            const close_button = document.createElement('div')
            close_button.classList.add('close_button')
            close_button.innerHTML = '<img src="./assets/icons/close.svg">'

            
            const image = document.createElement('img')
            image.classList.add('main')
            image.src = image_src

            close_button.onclick = () => { modal.remove() }
            modal.ontouchstart = (event) => {
                if (event.target !== image) modal.remove()
            }
            image.ontouchstart = (event) => {
                event.stopPropagation()
            }
            modal.onclick = (event) => {
                if (event.target !== image) modal.remove()
            }
            image.onclick = (event) => {
                event.stopPropagation()
            }

            modal.appendChild(close_button)
            modal.appendChild(image)

            document.body.appendChild(modal)
        }
    },
    validate_order_id: async () => {
        const id = app.elements.ORDER_INPUT.value.toUpperCase()
        
        const network_error = () => {
            app.change_page(app.pages.ERROR_PAGE)
            app.elements.ERROR_MESSAGE.innerText = 'A Network error occured'
            return false
        }
        
        if (id.length == 0) {
            app.change_page(app.pages.FORM_PAGE)
            app.error.show_order("Order ID is required.")
            return false
        }

        try {
            const response = await fetch(IS_VALID_JOB_API(id))

            if (!response.ok) return network_error()

            const data = await response.json()

            if (data.message == "INVALID") {
                app.error.show_order("Order ID is Invalid")
                app.change_page(app.pages.FORM_PAGE)
                return false
            }

            return true

        } catch (e) { return network_error() }
    },
    validate_photos_length: () => {
        if (app.data.photos.length > 0) return true

        app.change_page(app.pages.FORM_PAGE)
        app.error.show_photo("You must submit at least one image.")
        return false
    },
    convert_photos_to_form_data: () => {
        // append current files to new data transfer obj
        const data_transfer = new DataTransfer()
        app.data.photos.forEach(photo => {
            data_transfer.items.add(photo.file)
        })

        // create new input and store files inside
        const input = document.createElement('input')
        input.type = 'file'
        input.name = 'images' // google id
        input.files = data_transfer.files

        return input
    },
    upload_file: (file, order_id) => {
        // !IMPORTANT - requires firebase to be configured already 'storage_ref' is used from that
        return new Promise((resolve, reject) => {
            const file_storage_ref = get_ref(`${order_id}/${file.name}`)
            upload_file_to_firebase(file_storage_ref, file, resolve, reject)
        })
    },
    upload_files: async (files, order_id) => {
        try {
            app.elements.LOADING_TEXT.innerText = `Starting Upload`
            for (var i = 0; i < files.length; i++) {
                await app.upload_file(files[i], order_id);
                app.elements.LOADING_TEXT.innerText = `Uploaded ${i+1} of ${files.length}`
            }
            app.elements.SUCCESS_MESSAGE.innerText = `Total Photos Uploded Successfully: ${files.length}!`
            return true
        } catch (error) { 
            app.elements.ERROR_MESSAGE.innerText = error
            return false 
        }
    },
    submit: async () => {
        app.change_page(app.pages.LOADING_PAGE)
        app.elements.LOADING_TEXT.innerText = ''
        app.error.hide_all()

        if (!await app.validate_order_id() || !app.validate_photos_length()) return

        const order_id = app.elements.ORDER_INPUT.value.toUpperCase()

        const files = []
        app.data.photos.forEach(photo => files.push(photo.file))
        
        const success = await app.upload_files(files, order_id)
        
        if (success) app.change_page(app.pages.SUCCESS_PAGE)
        else app.change_page(app.pages.ERROR_PAGE)
    },
    read_files: (files) => {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                app.error.PHOTO_ERROR.classList.add('hidden')
                const reader = new FileReader()
                reader.onload = (e) => {
                    const src = e.target.result
                    const id = app.data.get_uuid()
                    app.data.photos.push({
                        id,
                        src,
                        file
                    })
                    app.elements.update_gallery()
                }
                reader.readAsDataURL(file)
            } else {
                app.error.show_photo('Only image files are accepted.')
            }
        })
    },
    change_page: (new_page) => {
        const pages = Object.values(app.pages)

        pages.forEach(page => {
            if (page !== new_page) page.classList.add('hidden')
            else page.classList.remove('hidden')
        })
    },
    prevent_defaults: (e) => {
        e.preventDefault();
        e.stopPropagation();
    },
    __init__: () => {
        app.change_page(app.pages.FORM_PAGE)
        app.elements.update_gallery_count()
        app.error.hide_all()

        // handle file input
        app.elements.UPLOAD_PHOTO.addEventListener('click', () => {
            let input = document.createElement('input')
            input.type = 'file'
            input.multiple = true
            input.accept = 'image/*'

            input.onchange = (event) => {
                const files = event.target.files
                app.read_files(files)
                input = null // delete input
            }

            input.click()
        })
        // handle drag and drop
        app.elements.UPLOAD_PHOTO.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            app.elements.UPLOAD_PHOTO.classList.remove('highlight')
            app.read_files(files)
        });
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            app.elements.UPLOAD_PHOTO.addEventListener(eventName, app.prevent_defaults)
            document.body.addEventListener(eventName, app.prevent_defaults)
        });
        app.elements.UPLOAD_PHOTO.addEventListener('dragenter', () => {
            app.elements.UPLOAD_PHOTO.classList.add('highlight')
        })
        app.elements.UPLOAD_PHOTO.addEventListener('dragleave', () => {
            app.elements.UPLOAD_PHOTO.classList.remove('highlight')
        })

        // button connections
        app.buttons.SUBMIT.onclick = async () => {
            app.submit()
        }
        app.buttons.SUBMIT_AGAIN.onclick = () => {
            app.change_page(app.pages.FORM_PAGE)
        }
        app.buttons.SUBMIT_ANOTHER.onclick = () => {
            app.change_page(app.pages.FORM_PAGE)
            app.elements.ORDER_INPUT.value = ''
            app.data.photos = []
            app.elements.update_gallery()
        } // reset the form
    }
}
app.__init__()

// todo -> transition firebase bucket to actual production account