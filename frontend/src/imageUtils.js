// All images of a product: the `images` array when present, else the legacy single `image`.
export function productImages(product) {
  if (Array.isArray(product.images) && product.images.length) return product.images
  return product.image ? [product.image] : []
}

export function coverImage(product) {
  return productImages(product)[0] || null
}

// Read a picked file, downscale it and return a compressed JPEG data URL.
export function fileToDataUrl(file, maxDim = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not read image: ${file.name}`))
    }
    img.src = url
  })
}
