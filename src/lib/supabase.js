import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function createNoopResponse(message) {
  return {
    data: null,
    error: new Error(message),
  }
}

function createNoopQuery() {
  const query = {
    select() {
      return query
    },
    insert() {
      return query
    },
    update() {
      return query
    },
    delete() {
      return query
    },
    upsert() {
      return query
    },
    eq() {
      return query
    },
    order() {
      return query
    },
    limit() {
      return query
    },
    single() {
      return Promise.resolve(createNoopResponse('Supabase is not configured.'))
    },
    maybeSingle() {
      return Promise.resolve(createNoopResponse('Supabase is not configured.'))
    },
    then(resolve, reject) {
      return Promise.resolve(createNoopResponse('Supabase is not configured.')).then(
        resolve,
        reject
      )
    },
  }

  return query
}

const noopSubscription = {
  unsubscribe() {},
}

const noopClient = {
  auth: {
    async getSession() {
      return { data: { session: null } }
    },
    onAuthStateChange() {
      return { data: { subscription: noopSubscription } }
    },
    async signUp() {
      return createNoopResponse('Supabase is not configured.')
    },
    async signInWithPassword() {
      return createNoopResponse('Supabase is not configured.')
    },
    async signOut() {
      return createNoopResponse('Supabase is not configured.')
    },
  },
  from() {
    return createNoopQuery()
  },
  async rpc() {
    return createNoopResponse('Supabase is not configured.')
  },
  storage: {
    from() {
      return {
        async upload() {
          return createNoopResponse('Supabase is not configured.')
        },
        getPublicUrl() {
          return { data: { publicUrl: '' } }
        },
        async remove() {
          return createNoopResponse('Supabase is not configured.')
        },
      }
    },
  },
  channel() {
    return {
      on() {
        return this
      },
      subscribe() {
        return noopSubscription
      },
    }
  },
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : noopClient
