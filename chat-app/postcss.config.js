/** @type {import('postcss-load-config').Config} */
const config = {
    plugins: [
        require('postcss-viewport-height-correction'),
        require('autoprefixer'),
        require('postcss-nested')
    ]
}

module.exports = config