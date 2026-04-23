/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { uploadStorageImage, getStorageErrorMessage } from '../lib/storage'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  function buildProfilePayload(authUser, options = {}) {
    const username =
      options.username ??
      authUser.user_metadata?.username ??
      authUser.email?.split('@')[0] ??
      ''
    const fullName =
      options.fullName ??
      authUser.user_metadata?.full_name ??
      username
    const payload = {
      id: authUser.id,
      email: options.email ?? authUser.email ?? '',
      username: username.toLowerCase(),
      full_name: fullName,
    }

    if (options.markOnline) {
      payload.is_online = true
      payload.last_seen = new Date().toISOString()
    }

    return payload
  }

  function isMissingFunctionError(error) {
    return (
      error?.code === 'PGRST202' ||
      error?.code === '42883' ||
      error?.message?.includes('Could not find the function')
    )
  }

  function isAlreadyRegisteredError(error) {
    const message = error?.message?.toLowerCase() ?? ''
    const code = error?.code?.toLowerCase() ?? ''

    return (
      message.includes('already registered') ||
      message.includes('already been registered') ||
      code.includes('user_already_exists') ||
      code.includes('email_exists')
    )
  }

  const ensureCurrentProfile = useCallback(async (authUser, options = {}) => {
    if (!authUser) {
      return {
        data: null,
        error: new Error('No authenticated user found'),
      }
    }

    const rpcResult = await supabase.rpc('ensure_current_profile_exists', {
      p_mark_online: options.markOnline ?? false,
    })

    if (!rpcResult.error && rpcResult.data) {
      setProfile(rpcResult.data)
      return rpcResult
    }

    if (!isMissingFunctionError(rpcResult.error)) {
      return rpcResult
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(buildProfilePayload(authUser, options), { onConflict: 'id' })
      .select()
      .single()

    if (!error) {
      setProfile(data)
    }

    return { data, error }
  }, [])

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        setProfile(null)
        return null
      }

      setProfile(data)
      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }, [])

  const syncAuthenticatedUser = useCallback(async (authUser, options = {}) => {
    try {
      const { data, error } = await ensureCurrentProfile(authUser, options)

      if (error || !data) {
        await fetchProfile(authUser.id)
      }
    } catch (error) {
      console.error('Error syncing authenticated user:', error)
      await fetchProfile(authUser.id)
    } finally {
      setLoading(false)
    }
  }, [ensureCurrentProfile, fetchProfile])

  useEffect(() => {
    let isMounted = true

    async function initializeSession() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!isMounted) return

      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user) {
        void syncAuthenticatedUser(session.user, { markOnline: true })
      } else {
        setProfile(null)
      }
    }

    initializeSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        setUser(session?.user ?? null)
        setLoading(false)

        if (session?.user) {
          void syncAuthenticatedUser(session.user, {
            markOnline: event === 'SIGNED_IN' || event === 'USER_UPDATED',
          })
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [syncAuthenticatedUser])

  async function signUp(email, password, username, fullName) {
    const normalizedUsername = username.trim().toLowerCase()
    const normalizedFullName = fullName?.trim() || normalizedUsername
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: normalizedUsername,
          full_name: normalizedFullName,
          email: email,
        },
      },
    })

    if (error) {
      if (isAlreadyRegisteredError(error)) {
        const loginResult = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (!loginResult.error && loginResult.data.user) {
          void syncAuthenticatedUser(loginResult.data.user, {
            markOnline: true,
          })

          return {
            data: loginResult.data,
            error: null,
            requiresEmailConfirmation: false,
            restoredExistingAccount: true,
          }
        }
      }

      return { data, error, requiresEmailConfirmation: false }
    }

    if (data.user && data.session) {
      void syncAuthenticatedUser(data.user, {
        email,
        username: normalizedUsername,
        fullName: normalizedFullName,
        markOnline: true,
      })
    }

    return {
      data,
      error: null,
      requiresEmailConfirmation: !data.session,
      restoredExistingAccount: false,
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { data, error }
    }

    if (data.user) {
      void syncAuthenticatedUser(data.user, {
        markOnline: true,
      })
    }

    return { data, error: null }
  }

  async function signOut() {
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', user.id)

      if (error) {
        console.error('Error marking user offline:', error)
      }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error }
    }

    setUser(null)
    setProfile(null)

    return { error: null }
  }

  async function updateProfile(updates) {
    if (!user) return { error: 'No user' }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (!error) {
      setProfile(data)
    }
    return { data, error }
  }

  async function uploadAvatar(file) {
    if (!user) return { error: 'No user' }

    const bucket = 'avatars'
    const previousAvatarPath = profile?.avatar_path || null
    const { data: uploadData, error: uploadError } = await uploadStorageImage({
      client: supabase,
      bucket,
      file,
      userId: user.id,
      folder: 'profiles',
    })

    if (uploadError) {
      return { error: new Error(getStorageErrorMessage(uploadError, { bucket })) }
    }

    const result = await updateProfile({
      avatar_url: uploadData.publicUrl,
      avatar_path: uploadData.path,
      avatar_bucket: bucket,
      avatar_mime_type: uploadData.metadata.mimeType,
      avatar_size_bytes: uploadData.metadata.sizeBytes,
      avatar_original_name: uploadData.metadata.originalName,
    })

    if (result.error) {
      await supabase.storage.from(bucket).remove([uploadData.path])
      return result
    }

    if (previousAvatarPath && previousAvatarPath !== uploadData.path) {
      await supabase.storage.from(bucket).remove([previousAvatarPath])
    }

    return result
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    uploadAvatar,
    refreshProfile: () => user && fetchProfile(user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
