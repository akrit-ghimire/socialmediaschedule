import { get_ref, upload_file_to_firebase, get_app_storage, get_file_url } from "./firebase.js"

const get = (selector, parent = document) => parent.querySelector(selector)

const app = {
    constants: {
        edit: false,
        post_key: null,
        media_player: get('#media-player'),
        app: get('.app'),
        exists: [],
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    },

    pages: {
        timeline: {
            elem: get('.timeline-view'),
            func: () => { app.timeline() },
        },
        edit: {
            elem: get('.edit-view'),
            func: () => { app.edit() }
        },
        loading: {
            elem: get('.loading-view'),
            func: () => {}
        },
    },
    buttons: {
        back: get('.go-back'),
        new: get('.add-new'),
        delete: get('#delete'),
        update: get('#update'),
        bin: get('#bin'),
        download: get('#download'),
        generate_hashtag: get('#generate_hashtag')
    },
    inputs: {
        title: get('#title-input'),
        date: get('#date-input'),
        description: get('#description-input'),
        hashtags: get('#hashtag-input'),
        buttons: get('#button-inputs'),
    },
    video_screens: {
        loading: get('#video-loading'),
        video: get('#video-found'),
        upload: get('#video-upload')
    },
    switch_video_screen: (screen) => {
        Object.keys(app.video_screens).forEach(key => {
            app.video_screens[key].classList.add('hidden')
        })
        screen.classList.remove('hidden')
    },
    switch_page: (page) => {
        Object.keys(app.pages).forEach(key => {
            app.pages[key].elem.classList.add('hidden')
        })
        page.elem.classList.remove('hidden')
        page.func()
    },

    notify: (message, color) => {
        const notificaton = document.createElement('div')
        notificaton.classList.add('notification', color)
        notificaton.innerText = message
        app.constants.app.appendChild(notificaton)
        setTimeout(() => {
            app.constants.app.removeChild(notificaton)
        }, 4000)
    },

    timeline_month: (month) => `
        <div class="vertical-line">
            <div class="ball"></div>
        </div>
        <h1>${month}</h1>
        <div class="cards-list">
        </div>
    `,

    timeline_card: (date, title) => `
        <div class="date">
            <p>${date}</p>
        </div>
        <p class="text">${title}</p>
    `,

    timeline: async () => {
        app.constants.media_player.muted = true
        app.buttons.back.classList.add('hidden')
        app.pages.timeline.elem.innerHTML = ''
        const [current_day, current_month, current_year] = new Date().toLocaleDateString().split('/')
        
        // show loading circle
        app.switch_page(app.pages.loading)
        
        // get details from firebase
        let storage = await get_app_storage()
        
        // handle storage none
        
        app.constants.exists = [] // only clear if storage fetch worked
        storage = storage.sort()

        const starting_year = parseInt(storage[0].path)
        const ending_year = parseInt(storage[storage.length -1].path)

        const get_field = (array, field) => { 
            for (let i = 0; i < array.length; i++) {
                const item = array[i];
                if (item.path == field) return item  
            }
            return null
        }

        // for each month populate fields
        for (let i = starting_year; i <= ending_year; i++) {
            const year = i
            const year_data = get_field(storage, year.toString())
            
            for (let j = 1; j <= 12; j++) {
                const month = j.toString().padStart(2, '0') // 6 -> 06
                
                // print month
                const month_elem = document.createElement('month')
                month_elem.classList.add('month')
                if (current_month == month && current_year == year.toString()) {
                    month_elem.id = 'active'
                }
                month_elem.innerHTML = app.timeline_month(app.constants.months[month -1])
                app.pages.timeline.elem.append(month_elem)

                
                if (!year_data) continue
                
                const month_data = get_field(year_data.children, year_data.path + '/' + month)
                if (!month_data) continue
                
                const cards_list_elem = get('.cards-list', month_elem)

                month_data.children.forEach(day => {
                    app.constants.exists.push(day.path) // only one item per day

                    const day_num = day.path.split('/')[2] // ['2024', '06', '07'] => '07'
                    const filepath = day.children[0].path // mp4 file
                    const filename = filepath.split('/')[3]
                    const lastDotIndex = filename.lastIndexOf('.')
                    const filename_without_ext = filename.slice(0, lastDotIndex)
                    const reformatted_filename = filename_without_ext.replace(/-/g, ' ')

                    const card = document.createElement('div')
                    card.classList.add('card')
                    card.innerHTML = app.timeline_card(day_num, reformatted_filename)

                    card.onclick = () => {
                        app.constants.post_key = filepath
                        app.switch_page(app.pages.edit)
                    }

                    cards_list_elem.append(card)
                })
               
            }
        }

        app.pages.loading.elem.classList.add('hidden')
        app.pages.timeline.elem.classList.remove('hidden')

        const active_month = document.querySelector('#active') // feature scroll to current month
        if (active_month) {
            const rect = active_month.getBoundingClientRect()
            window.scrollTo({
                top: rect.top,
                left: rect.left,
                behavior: "smooth",
            });
        }
    },

    disable_inputs: () => {
        app.inputs.title.disabled = true 
        app.inputs.date.disabled = true 
        app.inputs.description.disabled = true 
        app.inputs.hashtags.disabled = true 
        app.inputs.buttons.classList.add('hidden')
        app.buttons.bin.classList.add('hidden')
        app.buttons.generate_hashtag.classList.add('hidden')
    },

    enable_inputs: () => {
        app.inputs.title.disabled = false 
        app.inputs.date.disabled = false 
        app.inputs.description.disabled = false 
        app.inputs.hashtags.disabled = false 
        app.inputs.buttons.classList.remove('hidden')
        app.buttons.bin.classList.remove('hidden')
        app.buttons.generate_hashtag.classList.remove('hidden')
    },

    empty_inputs: () => {
        app.inputs.title.value = '' 
        app.inputs.date.value = '' 
        app.inputs.description.value = '' 
        app.inputs.hashtags.value = '' 
    },

    populate_inputs: ({ title, date, desc, hash }) => {
        app.inputs.title.value = title 
        app.inputs.date.value = date 
        app.inputs.description.value = desc
        app.inputs.hashtags.value = hash
    },

    skeleton: () => {
        const inputs = Object.keys(app.inputs)
        for (let i = 0; i < inputs.length-1; i++) {
            const input = app.inputs[inputs[i]];
            input.classList.add('skeleton')
        }
    },

    un_skeleton: () => {
        const inputs = Object.keys(app.inputs)
        
        for (let i = 0; i < inputs.length-1; i++) {
            const input = app.inputs[inputs[i]];
            input.classList.remove('skeleton')
        }
    },

    get_file_extension_from_name: (filename) => {
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex !== -1) return filename.slice(lastDotIndex + 1)
        return null
    },
    get_file_extension_from_url: (filename) => {
        let formatted

        const lastQuestionIndex = filename.lastIndexOf('?');
        if (lastQuestionIndex !== -1) formatted = filename.slice(0, lastQuestionIndex)
        else formatted = filename

        return app.get_file_extension_from_name(formatted)
    },
    remove_file_extension_from_name: (filename) => {
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex !== -1) return filename.slice(0, lastDotIndex)
        return filename
    },

    upload_file: (filepath, file) => {
        return new Promise((resolve, reject) => {
            const file_storage_ref = get_ref(filepath)
            upload_file_to_firebase(file_storage_ref, file, resolve, reject)
        })
    },

    get_file: (filepath) => {
        return new Promise((resolve, reject) => {
            get_file_url(get_ref(filepath), resolve, reject)
        })
    },

    read_file: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                const src = e.target.result
                resolve(src)
            }
            reader.onerror = (e) => {
                reject(null)
            }
            reader.readAsDataURL(file)
        })
    },

    get_meta: (text) => {
        const meta = {}

        const components = text.split('<!>')
        components.forEach(component => {
            const [command, data] = component.split(/-(.+)?/, 2)
            meta[command] = data
        })

        return meta
    },

    edit: async () => {
        app.constants.media_player.muted = false
        app.constants.media_player.src = ''
        app.buttons.update.innerHTML = 'Update'

        app.buttons.back.classList.remove('hidden')
        app.disable_inputs()
        app.switch_video_screen(app.video_screens.loading)
        
        // set all fields to skeleton
        app.skeleton()
        app.empty_inputs()

        // upload, download and delete
        const upload = document.createElement('input')
        upload.type = 'file'
        upload.multiple = false
        upload.accept = 'video/*'

        let video;
        let video_src;

        upload.onchange = async (event) => {
            const files = event.target.files
            if (files.length == 0) return 
            
            video = files[0]
            app.switch_video_screen(app.video_screens.loading)
            video_src = await app.read_file(files[0])
            app.constants.media_player.src = video_src
            app.switch_video_screen(app.video_screens.video)
        }
        // handle file delete
        app.buttons.bin.onclick = () => {
            upload.value = ''
            video = null
            video_src = null
            app.switch_video_screen(app.video_screens.upload)
        }
        // handlfe file upload
        app.video_screens.upload.onclick = () => {
            upload.click()
        }
        // handle file download
        app.buttons.download.onclick = () => {
            if (!app.constants.media_player.src) return 

            app.buttons.download.disabled = true
            app.buttons.download.innerHTML = '<div class="spinner"></div>'

            const a = document.createElement('a')
            a.href = app.constants.media_player.src
            
            let extension;
            if (video) extension = app.get_file_extension_from_name(video.name)
            else extension = app.get_file_extension_from_url(app.constants.media_player.src)
            
            if (!extension) {
                app.buttons.download.disabled = false
                app.notify('An Error Occured.', 'red')
                return 
            }

            if (!app.inputs.title.value) a.download = 'new_social.' + extension
            else a.download = app.inputs.title.value.replace(/\s/g, '-') + '.' + extension

            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            
            app.buttons.download.disabled = false
            app.buttons.download.innerHTML = '<img src="./assets/icons/download.svg">'
        }

        // handle entry update
        app.buttons.update.onclick = async () => {
            app.buttons.update.disabled = true

            const title = app.inputs.title.value
            const date = app.inputs.date.value
            const desc = app.inputs.description.value
            const hash = app.inputs.hashtags.value
            
            const valid = (text) => { return text.length > 3 }

            if (!app.constants.media_player.src || !valid(title) || !valid(date) || !valid(desc) || !valid(hash)) {
                app.buttons.update.disabled = false
                app.notify('All fields must be filled. And video must be uploaded.', 'red')
                return 
            }

            const filepath = date.replace(/-/g, '/') + '/' + title.replace(/\s/g, '-')
            
            // use filepath to check if file already exists then stop update
            
            const metadata = `title-${title}<!>date-${date}<!>desc-${desc}<!>hash-${hash}`
            const blob = new Blob([metadata], { type: 'text/plain' });
            const filename = 'metadata.txt'
            const meta = new File([blob], filename, { type: 'text/plain' });
            
            app.buttons.update.innerHTML = '<div class="spinner"></div>'
            
            
            if (video) {
                const fileextension = app.get_file_extension_from_name(video.name)
                if (!fileextension) {
                    app.notify('An error occured.', 'red')
                    app.buttons.update.disabled = false
                    return 
                }
                await app.upload_file(filepath + '.' + fileextension, video)
            }
            await app.upload_file(filepath + '.txt', meta)

            app.buttons.update.innerHTML = 'Update'
            app.buttons.update.disabled = false
            app.notify(`${title} has been updated successfully!`, 'green')
        }

        // delete entry
        app.buttons.delete.onclick = () => {
            key = app.constants.post_key
            app.constants.post_key = null 
            app.switch_page(app.pages.timeline)

            // start deletion
            app.notify(`${title} has been deleted successfully!`, 'green')
        }

        
        if (!app.constants.post_key) {
            app.un_skeleton()
            app.switch_video_screen(app.video_screens.upload)

            if (app.constants.edit) app.enable_inputs()
            return
        } 

        const video_url = app.constants.post_key
        const meta_url = app.remove_file_extension_from_name(app.constants.post_key) + '.txt'

        const video_data = await app.get_file(video_url)
        const metadata = await app.get_file(meta_url)
        
        if (!video_data || !metadata) {
            app.notify('Error Loading File', 'red')
            app.switch_page(app.pages.timeline)
            return
        }

        const metadata_text = await fetch(metadata).then((response) => response.text())
        console.log(metadata_text, 'metadata text')
        console.log(app.get_meta(metadata_text), 'retreived meta')

        app.constants.media_player.src = video_data
        app.populate_inputs(app.get_meta(metadata_text))

        app.un_skeleton()
        if (app.constants.edit) app.enable_inputs()
        app.switch_video_screen(app.video_screens.video)
    },

    __init__: () => {
        app.switch_page(app.pages.timeline)

        app.buttons.new.onclick = () => {
            app.constants.post_key = null
            app.switch_page(app.pages.edit)
        }
        app.buttons.back.onclick = () => {
            app.switch_page(app.pages.timeline)
        }
        app.buttons.generate_hashtag.onclick = () => {
            app.buttons.generate_hashtag.innerHTML = '<div class="spinner"></div>'
            app.buttons.generate_hashtag.disabled = true

            setTimeout(() => {
                // get generation using desc

                app.inputs.hashtags.value = 'generated...'

                app.buttons.generate_hashtag.innerHTML = 'Generate'
                app.buttons.generate_hashtag.disabled = false
            }, 2000)

        }
    }
}
app.constants.edit = true
app.__init__()

// firebase deploy code: firebase deploy --only hosting:edinburgh-hindusoc-social-media