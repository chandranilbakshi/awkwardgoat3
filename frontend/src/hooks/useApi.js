'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export const useApi = () => {
  const { user, refreshSession, logout } = useAuth()
  const router = useRouter()

  const apiCall = useCallback(async (url, options = {}) => {
    // If no user, redirect to signup
    if (!user) {
      router.push('/signup')
      throw new Error('Not authenticated')
    }

    const accessToken = localStorage.getItem('access_token')
    
    if (!accessToken) {
      router.push('/signup')
      throw new Error('No access token')
    }

    // Set up default headers with authorization
    const defaultHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const config = {
      ...options,
      headers: defaultHeaders,
    }

    try {
      // Make the initial request
      const response = await fetch(url, config)

      // If token is invalid (401), try to refresh
      if (response.status === 401) {
        console.log('Token expired, attempting to refresh...')
        
        const refreshSuccess = await refreshSession()
        
        if (refreshSuccess) {
          // Retry the request with the new token
          const newAccessToken = localStorage.getItem('access_token')
          const retryConfig = {
            ...config,
            headers: {
              ...config.headers,
              'Authorization': `Bearer ${newAccessToken}`,
            },
          }
          
          const retryResponse = await fetch(url, retryConfig)
          
          // If still unauthorized after refresh, logout
          if (retryResponse.status === 401) {
            logout()
            throw new Error('Authentication failed')
          }
          
          return retryResponse
        } else {
          // Refresh failed, logout
          logout()
          throw new Error('Session expired')
        }
      }

      return response
    } catch (error) {
      // Handle network errors
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        throw new Error('Network error. Please check your connection.')
      }
      throw error
    }
  }, [user, refreshSession, logout, router])

  return { apiCall }
}
