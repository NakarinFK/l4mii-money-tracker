// File validation utilities

/**
 * Allowed file types for upload
 */
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'text/plain'],
  data: ['application/json', 'text/csv']
}

/**
 * Maximum file sizes (in bytes)
 */
export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  default: 2 * 1024 * 1024 // 2MB
}

/**
 * Validates uploaded file
 */
export function validateFile(file, options = {}) {
  const {
    allowedTypes = [...ALLOWED_FILE_TYPES.images, ...ALLOWED_FILE_TYPES.documents],
    maxSize = MAX_FILE_SIZES.default,
    maxFileNameLength = 255
  } = options

  const errors = []

  // Check if file exists
  if (!file) {
    return { isValid: false, errors: ['No file provided'] }
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`)
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024))
    errors.push(`File size ${Math.round(file.size / (1024 * 1024))}MB exceeds maximum allowed size of ${maxSizeMB}MB`)
  }

  // Check file name
  if (!file.name || file.name.length === 0) {
    errors.push('File name cannot be empty')
  }

  if (file.name.length > maxFileNameLength) {
    errors.push(`File name too long (max ${maxFileNameLength} characters)`)
  }

  // Check for dangerous file names
  const dangerousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,  // Reserved names (Windows)
    /^\./,  // Hidden files
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(file.name)) {
      errors.push('File name contains invalid characters or patterns')
      break
    }
  }

  // Check file extension matches type
  const extension = file.name.split('.').pop()?.toLowerCase()
  const expectedExtensions = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'application/pdf': ['pdf'],
    'text/plain': ['txt'],
    'application/json': ['json'],
    'text/csv': ['csv']
  }

  if (extension && expectedExtensions[file.type] && !expectedExtensions[file.type].includes(extension)) {
    errors.push(`File extension .${extension} does not match file type ${file.type}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedFile: sanitizeFileName(file)
  }
}

/**
 * Sanitizes file name to prevent directory traversal and other attacks
 */
function sanitizeFileName(file) {
  // Remove dangerous characters and patterns
  const sanitizedName = file.name
    .replace(/[<>:"|?*]/g, '')  // Remove invalid characters
    .replace(/\.\./g, '.')      // Replace directory traversal
    .replace(/^\./, '')         // Remove leading dot (hidden files)
    .substring(0, 255)          // Limit length

  // Create a new File object with sanitized name
  return new File([file], sanitizedName, {
    type: file.type,
    lastModified: file.lastModified
  })
}

/**
 * Validates image file specifically
 */
export function validateImageFile(file) {
  return validateFile(file, {
    allowedTypes: ALLOWED_FILE_TYPES.images,
    maxSize: MAX_FILE_SIZES.image
  })
}

/**
 * Reads and validates file content for additional security
 */
export async function validateFileContent(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const content = e.target.result
      
      // Basic content validation
      const issues = []
      
      // Check for script content in non-JS files
      if (file.type !== 'application/json' && file.type !== 'text/javascript') {
        const contentStr = typeof content === 'string' ? content : new TextDecoder().decode(content)
        if (contentStr.includes('<script>') || contentStr.includes('javascript:')) {
          issues.push('File contains potentially dangerous script content')
        }
      }
      
      // Check for malicious patterns
      const maliciousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /eval\s*\(/gi,
        /Function\s*\(/gi
      ]
      
      const contentStr = typeof content === 'string' ? content : new TextDecoder().decode(content)
      for (const pattern of maliciousPatterns) {
        if (pattern.test(contentStr)) {
          issues.push('File contains potentially malicious code patterns')
          break
        }
      }
      
      resolve({
        isValid: issues.length === 0,
        issues
      })
    }
    
    reader.onerror = () => {
      resolve({
        isValid: false,
        issues: ['Failed to read file content']
      })
    }
    
    // Read as text for validation
    if (file.type.startsWith('text/') || file.type === 'application/json') {
      reader.readAsText(file)
    } else {
      // For binary files, just read a small portion
      reader.readAsArrayBuffer(file.slice(0, 1024))
    }
  })
}
