run:
	$(MAKE) -j 2 tauri

dev:
	npm run dev

tauri:
	npm run tauri dev

icon:
	npm run tauri icon ./public/script-runner-2.png