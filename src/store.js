import { supabase } from './supabase.js'

export async function loadMap(id) {
  const { data, error } = await supabase
    .from('maps')
    .select('data, user_id')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function saveMap(graph) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('maps')
    .update({ title: graph.title, data: graph })
    .eq('id', graph.id)

  if (error) throw error
}

export async function createMap(graph, userId) {
  const { data: { session } } = await supabase.auth.getSession()
  console.log('session user:', session?.user?.id)
  console.log('userId passed:', userId)

  if (!session) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('maps')
    .insert({ title: graph.title, data: graph, user_id: session.user.id }) // use session directly
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

export function makeDefaultGraph() {
  return {
    id: null,
    title: 'Untitled Argument Map',
    nodes: [
      { "id": "2e46ea52-f9cc-4f21-b327-96b29fe57879", "type": "thesis", "text": "Mathematics should be mandatory in school", "x": 616, "y": 72, "w": 333, "h": 70 },
      { "id": "fa37e3e5-c08c-4eb8-aa10-1806fb6773ea", "type": "reason", "text": "Schools should teach skills adults need in daily life", "x": 405, "y": 242, "w": 221, "h": 70 },
      { "id": "883477ec-180c-4803-ab0d-569385d82e8f", "type": "reason", "text": "Schools should teach skills adults need in daily life.", "x": 403, "y": 375, "w": 224, "h": 70 },
      { "id": "4e88235f-c2c9-47cb-8e13-cfc26ac5dfc1", "type": "reason", "text": "Mathematics teaches logical problem-solving.", "x": 672, "y": 247, "w": 218, "h": 70 },
      { "id": "705a02e9-bae0-4c70-8d01-5e0f3476fdcc", "type": "reason", "text": "Logical problem-solving is an important skill.", "x": 672, "y": 377, "w": 219, "h": 70 },
      { "id": "cb10600c-4d67-49f5-a2ac-ad2fe5f19573", "type": "reason", "text": "Many careers require mathematics.", "x": 931, "y": 249, "w": 242, "h": 70 },
      { "id": "9c3cd81d-4e0c-447a-be4d-f65380e4b3ad", "type": "reason", "text": "Schools should prepare students for future careers.", "x": 931, "y": 374, "w": 245, "h": 70 },
      { "id": "d7a6e6fd-ed39-4d7a-9d84-936a2ff1c0dd", "type": "objection", "text": "Not every student will use advanced math in life.", "x": 1211, "y": 374, "w": 255, "h": 70 },
      { "id": "da01f592-c93f-4cdc-8678-d45028f802dd", "type": "rebuttal", "text": "Schools can still require basic mathematics because basic math is widely useful even if advanced topics are not.", "x": 1211, "y": 503, "w": 258, "h": 70 }
    ],
    edges: [
      { "from": "fa37e3e5-c08c-4eb8-aa10-1806fb6773ea", "to": "2e46ea52-f9cc-4f21-b327-96b29fe57879", "type": "reason" },
      { "from": "883477ec-180c-4803-ab0d-569385d82e8f", "to": "fa37e3e5-c08c-4eb8-aa10-1806fb6773ea", "type": "reason" },
      { "from": "4e88235f-c2c9-47cb-8e13-cfc26ac5dfc1", "to": "2e46ea52-f9cc-4f21-b327-96b29fe57879", "type": "reason" },
      { "from": "705a02e9-bae0-4c70-8d01-5e0f3476fdcc", "to": "4e88235f-c2c9-47cb-8e13-cfc26ac5dfc1", "type": "reason" },
      { "from": "cb10600c-4d67-49f5-a2ac-ad2fe5f19573", "to": "2e46ea52-f9cc-4f21-b327-96b29fe57879", "type": "reason" },
      { "from": "9c3cd81d-4e0c-447a-be4d-f65380e4b3ad", "to": "cb10600c-4d67-49f5-a2ac-ad2fe5f19573", "type": "reason" },
      { "from": "d7a6e6fd-ed39-4d7a-9d84-936a2ff1c0dd", "to": "cb10600c-4d67-49f5-a2ac-ad2fe5f19573", "type": "objection" },
      { "from": "da01f592-c93f-4cdc-8678-d45028f802dd", "to": "d7a6e6fd-ed39-4d7a-9d84-936a2ff1c0dd", "type": "rebuttal" }
    ]
  }
}