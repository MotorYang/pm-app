/**
 * Client-side crypto utilities
 * Note: These are simple utilities. Real encryption happens in Rust backend.
 */

/**
 * Simple hash function for client-side password hashing
 * In production, this would use proper crypto libraries
 * For now, we'll just use a placeholder since real hashing happens in Rust
 */
export async function hashPassword(password) {
  // This is a placeholder - actual hashing will be done in Rust
  // We're just creating a simple hash for storage
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // Generate a random salt
  const saltArray = new Uint8Array(16)
  crypto.getRandomValues(saltArray)
  const salt = Array.from(saltArray).map(b => b.toString(16).padStart(2, '0')).join('')

  return {
    hash: hashHex,
    salt: salt
  }
}

/**
 * Generate a random string for salts
 */
export function generateSalt(length = 32) {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}
