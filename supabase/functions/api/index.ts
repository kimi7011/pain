// 揉PAin 訂購系統 — Supabase Edge Function
// 取代原 Google Apps Script (Code.gs)
import { createClient } from 'supabase'
import { serve } from 'http/server'

// ============ 環境變數 ============
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') || ''
const LINE_ADMIN_USER_ID = Deno.env.get('LINE_ADMIN_USER_ID') || ''
const LINE_LOGIN_CHANNEL_ID = Deno.env.get('LINE_LOGIN_CHANNEL_ID') || ''
const LINE_LOGIN_CHANNEL_SECRET = Deno.env.get('LINE_LOGIN_CHANNEL_SECRET') || ''
const LINE_LOGIN_REDIRECT_URI = Deno.env.get('LINE_LOGIN_REDIRECT_URI') || ''

// Supabase client (使用 service_role 繞過 RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============ CORS 標頭 ============
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ============ 主路由 ============
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'getProducts'

  let data: Record<string, unknown> = {}
  if (req.method === 'POST') {
    try {
      data = await req.json()
    } catch {
      // fallback: 使用 URL 參數
      url.searchParams.forEach((v, k) => { data[k] = v })
    }
  } else {
    url.searchParams.forEach((v, k) => { data[k] = v })
  }

  let result: unknown
  try {
    switch (action) {
      // ---- GET 類 ----
      case 'getProducts':
        result = await getProducts(); break
      case 'getOrders':
        result = await getOrders(data.userId as string); break
      case 'verifyAdmin':
        result = await verifyAdmin(data.userId as string); break
      case 'lineLogin':
        result = await handleLineLogin(data.code as string); break
      case 'getCategories':
        result = await getCategories(); break
      case 'customerLineLogin':
        result = await customerLineLogin(data.code as string, data.redirectUri as string); break
      case 'getSettings':
        result = await getSettings(); break
      case 'getBlacklist':
        result = await getBlacklist(data.userId as string); break
      case 'getMyOrders':
        result = await getMyOrders(data.lineUserId as string); break
      case 'getInitData':
        result = await getInitData(); break
      case 'getLineLoginUrl':
        result = getLineLoginUrl(data.redirectUri as string); break
      case 'getLineBotSettings':
        result = await getLineBotSettings(); break
      case 'getUsers':
        result = await getUsers(data as { userId: string; search?: string }); break

      // ---- POST 類 ----
      case 'submitOrder':
        result = await submitOrder(data); break
      case 'addProduct':
        result = await addProduct(data); break
      case 'updateProduct':
        result = await updateProduct(data); break
      case 'deleteProduct':
        result = await deleteProduct(data); break
      case 'addCategory':
        result = await addCategory(data); break
      case 'updateCategory':
        result = await updateCategory(data); break
      case 'deleteCategory':
        result = await deleteCategory(data); break
      case 'reorderCategory':
        result = await reorderCategory(data); break
      case 'updateOrder':
        result = await updateOrder(data); break
      case 'deleteOrder':
        result = await deleteOrder(data); break
      case 'updateSettings':
        result = await updateSettingsAction(data); break
      case 'batchUpdateProducts':
        result = await batchUpdateProducts(data); break
      case 'reorderProduct':
        result = await reorderProduct(data); break
      case 'addToBlacklist':
        result = await addToBlacklist(data); break
      case 'removeFromBlacklist':
        result = await removeFromBlacklist(data); break
      case 'saveLineBotSettings':
        result = await saveLineBotSettings(data); break
      case 'switchLineBot':
        result = await switchLineBot(data); break
      case 'updateUserRole':
        result = await updateUserRole(data); break
      case 'batchDeleteOrders':
        result = await batchDeleteOrders(data); break
      default:
        result = { success: false, error: '未知的操作' }
    }
  } catch (error) {
    result = { success: false, error: String(error) }
  }

  return jsonResponse(result)
})

// ============ 初始化資料（效能優化）============

async function getInitData() {
  const [productsResult, categoriesResult, settingsResult] = await Promise.all([
    getProducts(),
    getCategories(),
    getSettings(),
  ])
  return {
    success: true,
    products: productsResult.success ? productsResult.products : [],
    categories: categoriesResult.success ? categoriesResult.categories : [],
    settings: settingsResult.success ? settingsResult.settings : {},
  }
}

// ============ LINE Login URL ============

function getLineLoginUrl(redirectUri: string) {
  if (!redirectUri) {
    return { success: false, error: '缺少 redirectUri' }
  }
  const state = crypto.randomUUID()
  const authUrl = 'https://access.line.me/oauth2/v2.1/authorize?' +
    'response_type=code&' +
    'client_id=' + LINE_LOGIN_CHANNEL_ID + '&' +
    'redirect_uri=' + encodeURIComponent(redirectUri) + '&' +
    'state=' + state + '&' +
    'scope=profile%20openid'
  return { success: true, authUrl, state }
}

// ============ 商品功能 ============

async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return { success: false, error: error.message }

  const products = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    category: row.category,
    name: row.name,
    price: row.price,
    note: row.note || '',
    enabled: row.enabled !== false,
    sortOrder: row.sort_order || 0,
  }))

  return { success: true, products }
}

async function addProduct(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  // 檢查重複名稱
  if (!data.force) {
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('name', String(data.name).trim())
      .limit(1)

    if (existing && existing.length > 0) {
      return { success: false, isDuplicate: true, message: '商品名稱重複' }
    }
  }

  const insertData: Record<string, string | number | boolean> = {
    category: data.category as string,
    name: data.name as string,
    price: parseInt(String(data.price)),
    note: (data.note as string) || '',
    enabled: true,
  }

  let { data: inserted, error } = await supabase
    .from('products')
    .insert(insertData)
    .select('id')
    .single()

  // ---- 自我修復邏輯：處理序列不同步產生的主鍵衝突 ----
  if (error && (error.message.includes('products_pkey') || error.code === '23505')) {
    console.log('偵測到主鍵重複錯誤，啟動自我修復機制...');
    
    // 取得目前最大 ID
    const { data: maxRows } = await supabase
      .from('products')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
    
    const maxId = (maxRows && maxRows.length > 0) ? maxRows[0].id : 0
    const nextId = maxId + 1
    console.log(`重試插入，指定新 ID: ${nextId}`)

    const retryResult = await supabase
      .from('products')
      .insert({ ...insertData, id: nextId })
      .select('id')
      .single()
    
    if (!retryResult.error) {
      return { success: true, message: '商品已新增 (自動修復序列)', id: retryResult.data.id }
    }
    error = retryResult.error // 如果重試也失敗，傳回重試的錯誤
  }

  if (error) return { success: false, error: error.message }
  return { success: true, message: '商品已新增', id: inserted?.id }
}

async function updateProduct(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  const { error } = await supabase
    .from('products')
    .update({
      category: data.category,
      name: data.name,
      price: parseInt(String(data.price)),
      note: data.note || '',
      enabled: data.enabled === true || data.enabled === 'true' || data.enabled === '啟用',
    })
    .eq('id', data.id)

  if (error) return { success: false, error: error.message }
  return { success: true, message: '商品已更新' }
}

async function deleteProduct(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', data.id)

  if (error) return { success: false, error: error.message }
  return { success: true, message: '商品已刪除' }
}

// ============ 訂單功能 ============

function sanitizeInput(str: unknown): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}

async function calculateOrderTotal(orderText: string): Promise<number | null> {
  try {
    const productsResult = await getProducts()
    if (!productsResult.success) return null

    const priceMap: Record<string, number> = {}
    for (const p of (productsResult.products as { name: string, price: number }[])) {
      priceMap[p.name] = parseInt(String(p.price)) || 0
    }

    const lines = orderText.split('\n')
    let total = 0
    for (const line of lines) {
      const match = line.match(/^(.+?)\s*x\s*(\d+)/)
      if (match) {
        const productName = match[1].trim()
        const quantity = parseInt(match[2]) || 0
        const price = priceMap[productName]
        if (price !== undefined && quantity > 0) {
          total += price * quantity
        }
      }
    }
    return total
  } catch {
    return null
  }
}

async function submitOrder(data: Record<string, unknown>) {
  // 1. 輸入驗證
  if (!data.lineName || !data.contactPhone || !data.orders) {
    return { success: false, error: '缺少必要資訊' }
  }

  // 1.5 營業時間檢查
  const settingsResult = await getSettings()
  if (settingsResult.success) {
    const now = new Date()
    const isOpen = checkBusinessStatus(settingsResult.settings!, now)
    if (!isOpen) {
      return { success: false, error: '已超出送單時間，系統拒收訂單' }
    }
  }

  // 1.6 黑名單檢查
  const lineUserId = String(data.lineUserId || '')
  if (lineUserId && await isBlacklisted(lineUserId)) {
    return { success: false, error: '您的帳號已被停權，無法送出訂單' }
  }

  // 1.7 送單間隔檢查
  if (lineUserId && settingsResult.success) {
    const intervalMinutes = parseInt(String(settingsResult.settings!.order_interval_minutes)) || 0
    if (intervalMinutes > 0) {
      const intervalCheck = await checkOrderInterval(lineUserId, intervalMinutes)
      if (!intervalCheck.allowed) {
        return { success: false, error: intervalCheck.message }
      }
    }
  }

  // 2. 名稱長度限制
  const lineName = sanitizeInput(String(data.lineName).substring(0, 50))
  if (lineName.length === 0) {
    return { success: false, error: 'LINE 名稱不可為空' }
  }

  // 3. 電話格式驗證
  const phone = String(data.contactPhone).replace(/\s/g, '')
  const phonePattern = /^(09\d{8}|0[2-8]\d{7,8})$/
  if (!phonePattern.test(phone)) {
    return { success: false, error: '電話格式不正確，請輸入有效的台灣電話號碼' }
  }

  // 4. 後端價格驗算
  const orderText = String(data.orders)
  const clientTotal = parseInt(String(data.total)) || 0
  const serverTotal = await calculateOrderTotal(orderText)

  if (serverTotal === null) {
    return { success: false, error: '訂單內容無法解析' }
  }

  if (Math.abs(serverTotal - clientTotal) > 0) {
    console.log(`[安全警告] 價格不符: 前端=${clientTotal}, 後端=${serverTotal}`)
  }

  const finalTotal = serverTotal
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const orderId = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(Math.floor(Math.random() * 100))}`

  const sanitizedOrders = sanitizeInput(orderText)

  const { error } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      created_at: now.toISOString(),
      line_name: lineName,
      phone: phone,
      items: sanitizedOrders,
      total: finalTotal,
      line_user_id: lineUserId,
    })

  if (error) return { success: false, error: error.message }

  // 發送 LINE 通知
  await sendLineNotification({
    lineName, contactPhone: phone, orders: sanitizedOrders, total: finalTotal
  }, orderId)

  // 更新用戶電話
  if (lineUserId) {
    try {
      await registerOrUpdateUser({
        userId: lineUserId,
        displayName: String(lineName),
        pictureUrl: '',
        phone,
      })
    } catch (e) {
      console.log('更新用戶電話失敗: ' + e)
    }
  }

  return { success: true, message: '訂單已送出', orderId, phone }
}

async function getOrders(userId: string) {
  if (!(await verifyAdmin(userId)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message }

  const orders = (data || []).map((row: Record<string, unknown>) => ({
    orderId: row.id,
    timestamp: row.created_at,
    lineName: row.line_name,
    phone: row.phone,
    items: row.items,
    total: row.total,
    lineUserId: row.line_user_id || '',
  }))

  return { success: true, orders }
}

async function getMyOrders(lineUserId: string) {
  if (!lineUserId) {
    return { success: false, error: '缺少用戶 ID' }
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('line_user_id', lineUserId)
    .order('created_at', { ascending: false })

  if (error) return { success: true, orders: [] }

  const orders = (data || []).map((row: Record<string, unknown>) => ({
    orderId: row.id,
    timestamp: row.created_at,
    lineName: row.line_name,
    phone: row.phone,
    items: row.items,
    total: row.total,
  }))

  return { success: true, orders }
}

async function updateOrder(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  const { error } = await supabase
    .from('orders')
    .update({
      line_name: data.lineName,
      phone: data.phone,
      items: data.items,
      total: parseInt(String(data.total)),
    })
    .eq('id', data.orderId)

  if (error) return { success: false, error: error.message }
  return { success: true, message: '訂單已更新' }
}

async function deleteOrder(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', data.orderId)

  if (error) return { success: false, error: error.message }
  return { success: true, message: '訂單已刪除' }
}

async function batchDeleteOrders(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  const orderIds = (data.orderIds as string[]) || []
  if (orderIds.length === 0) {
    return { success: false, error: '未選擇任何訂單' }
  }

  const { error, count } = await supabase
    .from('orders')
    .delete()
    .in('id', orderIds)

  if (error) return { success: false, error: error.message }
  return { success: true, message: `已刪除 ${count || orderIds.length} 筆訂單`, deletedCount: count || orderIds.length }
}

// ============ 驗證功能 ============

async function verifyAdmin(userId: string): Promise<{ success: boolean; isAdmin: boolean; role?: string; message: string }> {
  // 1. Super Admin
  if (userId === LINE_ADMIN_USER_ID) {
    return { success: true, isAdmin: true, role: 'SUPER_ADMIN', message: 'Super Admin 驗證成功' }
  }

  // 2. 檢查資料庫中的角色
  try {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('line_user_id', userId)
      .single()

    if (data) {
      if (data.role === 'ADMIN') {
        return { success: true, isAdmin: true, role: 'ADMIN', message: 'Admin 驗證成功' }
      } else {
        return { success: false, isAdmin: false, role: 'USER', message: '您的帳號權限不足' }
      }
    }
  } catch {
    // 容錯
  }

  return { success: false, isAdmin: false, message: '非管理員帳號' }
}

async function handleLineLogin(code: string) {
  if (!code) {
    return { success: false, error: '缺少授權碼' }
  }

  try {
    // 1. 用 code 換取 access_token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: LINE_LOGIN_REDIRECT_URI,
        client_id: LINE_LOGIN_CHANNEL_ID,
        client_secret: LINE_LOGIN_CHANNEL_SECRET,
      }),
    })

    const tokenData = await tokenResponse.json()
    if (tokenData.error) {
      return { success: false, error: tokenData.error_description || tokenData.error }
    }

    // 2. 用 access_token 取得用戶資料
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token },
    })
    const profileData = await profileResponse.json()
    if (profileData.error) {
      return { success: false, error: profileData.error }
    }

    // 3. 自動註冊與更新用戶
    const userData = {
      userId: profileData.userId,
      displayName: profileData.displayName,
      pictureUrl: profileData.pictureUrl || '',
    }
    await registerOrUpdateUser(userData)

    // 4. 驗證管理員
    const authResult = await verifyAdmin(profileData.userId)
    if (!authResult.isAdmin) {
      return { success: false, error: '您的帳號沒有管理員權限', userId: userData.userId }
    }

    return {
      success: true,
      isAdmin: true,
      role: authResult.role,
      user: userData,
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function customerLineLogin(code: string, redirectUri: string) {
  if (!code) {
    return { success: false, error: '缺少授權碼' }
  }

  const actualRedirectUri = redirectUri || 'https://kimi7011.github.io/pain/pain.html'

  try {
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: actualRedirectUri,
        client_id: LINE_LOGIN_CHANNEL_ID,
        client_secret: LINE_LOGIN_CHANNEL_SECRET,
      }),
    })

    const tokenData = await tokenResponse.json()
    if (tokenData.error) {
      return { success: false, error: tokenData.error_description || tokenData.error }
    }

    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token },
    })
    const profileData = await profileResponse.json()
    if (profileData.error) {
      return { success: false, error: profileData.error }
    }

    const userData: Record<string, string> = {
      userId: profileData.userId,
      displayName: profileData.displayName,
      pictureUrl: profileData.pictureUrl || '',
    }
    const updatedUser = await registerOrUpdateUser(userData) || userData

    // 檢查黑名單
    const blacklistInfo = await getBlacklistInfo(profileData.userId)
    if (blacklistInfo.isBlacklisted) {
      return {
        success: false,
        isBlacklisted: true,
        error: '您的帳號已被封鎖',
        reason: blacklistInfo.reason || '未提供原因',
        blockedAt: blacklistInfo.blockedAt,
      }
    }

    return { success: true, user: updatedUser }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============ 分類功能 ============

async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (error) return { success: false, error: error.message }

  const categories = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
  }))

  return { success: true, categories }
}

async function addCategory(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  const { data: inserted, error } = await supabase
    .from('categories')
    .insert({ name: data.name })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, message: '分類已新增', id: inserted.id }
}

async function updateCategory(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  // 取得舊名稱
  const { data: old } = await supabase
    .from('categories')
    .select('name')
    .eq('id', data.id)
    .single()

  const oldName = old?.name
  const newName = data.name as string

  const { error } = await supabase
    .from('categories')
    .update({ name: newName })
    .eq('id', data.id)

  if (error) return { success: false, error: error.message }

  // 同步更新商品的分類名稱
  if (oldName && oldName !== newName) {
    await supabase
      .from('products')
      .update({ category: newName })
      .eq('category', oldName)
  }

  return { success: true, message: '分類已更新' }
}

async function deleteCategory(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', data.id)

  if (error) return { success: false, error: error.message }
  return { success: true, message: '分類已刪除' }
}

async function reorderCategory(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  // 取得所有分類（依 sort_order 排序）
  const { data: allCats, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (error || !allCats) return { success: false, error: '無法讀取分類' }

  const targetIndex = allCats.findIndex((c: Record<string, unknown>) => String(c.id) === String(data.id))
  if (targetIndex === -1) return { success: false, error: '找不到該分類' }

  const direction = data.direction as string
  const isFirst = targetIndex === 0
  const isLast = targetIndex === allCats.length - 1

  if ((direction === 'top' || direction === 'up') && isFirst) {
    return { success: false, error: '已在最頂端' }
  }
  if ((direction === 'bottom' || direction === 'down') && isLast) {
    return { success: false, error: '已在最底端' }
  }

  // 重新計算 sort_order
  const items = [...allCats]
  const [moved] = items.splice(targetIndex, 1)

  if (direction === 'top') {
    items.unshift(moved)
  } else if (direction === 'bottom') {
    items.push(moved)
  } else if (direction === 'up') {
    items.splice(targetIndex - 1, 0, moved)
  } else if (direction === 'down') {
    items.splice(targetIndex + 1, 0, moved)
  }

  // 批次更新 sort_order
  for (let i = 0; i < items.length; i++) {
    await supabase
      .from('categories')
      .update({ sort_order: i * 10 })
      .eq('id', items[i].id)
  }

  const msgs: Record<string, string> = { top: '分類已置頂', bottom: '分類已置底', up: '分類已上移', down: '分類已下移' }
  return { success: true, message: msgs[direction] || '排序已更新' }
}

// ============ LINE 通知 ============

async function sendLineNotification(orderData: { lineName: string; contactPhone: string; orders: string; total: number }, orderId: string) {
  const botSettings = await getLineBotSettings()
  const activeBot = await getActiveLineBot(botSettings.bots || [])

  if (!activeBot) {
    console.log('LINE 通知錯誤：無可用的 LINE Bot 帳號')
    return false
  }

  const message = `🍞 新訂單通知！\n\n訂單編號：${orderId}\n顧客名稱：${orderData.lineName}\n聯絡電話：${orderData.contactPhone}\n\n📦 訂單內容：\n${orderData.orders}\n\n💰 總金額：$${orderData.total}`

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (activeBot.token || LINE_CHANNEL_ACCESS_TOKEN),
      },
      body: JSON.stringify({
        to: activeBot.adminId || LINE_ADMIN_USER_ID,
        messages: [{ type: 'text', text: message }],
      }),
    })

    const result = await response.json()

    if (result.message === 'Quota exceeded') {
      console.log('LINE 通知錯誤：額度已滿')
      return false
    }

    if (response.ok) {
      await incrementBotUsage(activeBot.id)
    }

    return true
  } catch (error) {
    console.log('LINE 通知錯誤：' + error)
    return false
  }
}

// ============ 設定功能 ============

async function getSettings(): Promise<{ success: boolean; settings?: Record<string, string>; error?: string }> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')

  if (error) return { success: false, error: error.message }

  const settings: Record<string, string> = {}
  for (const row of (data || [])) {
    settings[row.key] = String(row.value ?? '')
  }

  // 計算營業狀態
  const now = new Date()
  const isOpen = checkBusinessStatus(settings, now)
  settings.currentlyOpen = String(isOpen)

  // 台北時區
  const taipeiTime = now.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' }).replace(' ', ' ').substring(0, 16)
  settings.currentTime = taipeiTime

  return { success: true, settings }
}

function checkBusinessStatus(settings: Record<string, string>, now: Date): boolean {
  if (settings.is_open === 'open') return true
  if (settings.is_open === 'closed') return false

  const taipeiNow = now.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' }).replace(' ', ' ').substring(0, 16)
  const startStr = (settings.business_period_start || '2000-01-01T00:00').replace('T', ' ')
  const endStr = (settings.business_period_end || '2000-01-01T00:00').replace('T', ' ')

  return taipeiNow >= startStr && taipeiNow < endStr
}

async function updateSettingsAction(data: Record<string, unknown>) {
  if (data.userId !== 'SYSTEM' && !(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  const updates = data.settings as Record<string, string>
  for (const key in updates) {
    await supabase
      .from('settings')
      .upsert({ key, value: updates[key] })
  }

  return { success: true, message: '設定已更新' }
}

// ============ 商品批次編輯功能 ============

async function batchUpdateProducts(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  const productIds = (data.productIds as (string | number)[]) || []
  const action = data.action as string
  let updatedCount = 0

  if (action === 'enable') {
    const { count } = await supabase
      .from('products')
      .update({ enabled: true })
      .in('id', productIds)
    updatedCount = count || productIds.length
  } else if (action === 'disable') {
    const { count } = await supabase
      .from('products')
      .update({ enabled: false })
      .in('id', productIds)
    updatedCount = count || productIds.length
  } else if (action === 'adjustPrice') {
    // 需要逐個更新（因為要基於當前值計算）
    for (const pid of productIds) {
      const { data: product } = await supabase
        .from('products')
        .select('price')
        .eq('id', pid)
        .single()

      if (product) {
        const adjustment = parseInt(String(data.priceAdjustment)) || 0
        const newPrice = Math.max(0, (product.price || 0) + adjustment)
        await supabase
          .from('products')
          .update({ price: newPrice })
          .eq('id', pid)
        updatedCount++
      }
    }
  }

  return { success: true, message: `已更新 ${updatedCount} 個商品`, updatedCount }
}

// ============ 商品排序功能 ============

async function reorderProduct(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  // 找到目標商品
  const { data: target } = await supabase
    .from('products')
    .select('*')
    .eq('id', data.id)
    .single()

  if (!target) return { success: false, error: '找不到該商品' }

  // 找出同分類的商品
  const { data: sameCategory } = await supabase
    .from('products')
    .select('*')
    .eq('category', target.category)
    .order('sort_order', { ascending: true })

  if (!sameCategory) return { success: false, error: '無法讀取同分類商品' }

  const targetIndex = sameCategory.findIndex((p: Record<string, unknown>) => String(p.id) === String(data.id))
  if (targetIndex === -1) return { success: false, error: '找不到該商品' }

  const direction = data.direction as string
  const items = [...sameCategory]
  const [moved] = items.splice(targetIndex, 1)

  if (direction === 'up' && targetIndex > 0) {
    items.splice(targetIndex - 1, 0, moved)
  } else if (direction === 'down' && targetIndex < sameCategory.length - 1) {
    items.splice(targetIndex + 1, 0, moved)
  } else if (direction === 'top' && targetIndex > 0) {
    items.unshift(moved)
  } else if (direction === 'bottom' && targetIndex < sameCategory.length - 1) {
    items.push(moved)
  } else {
    return { success: false, error: '無法移動' }
  }

  // 批次更新
  for (let i = 0; i < items.length; i++) {
    await supabase
      .from('products')
      .update({ sort_order: i * 10 })
      .eq('id', items[i].id)
  }

  const msgs: Record<string, string> = { up: '商品已上移', down: '商品已下移', top: '商品已置頂', bottom: '商品已置底' }
  return { success: true, message: msgs[direction] || '排序已更新' }
}

// ============ 黑名單功能 ============

async function getBlacklist(userId: string) {
  if (!(await verifyAdmin(userId)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  const { data, error } = await supabase
    .from('blacklist')
    .select('*')

  if (error) return { success: false, error: error.message }

  const blacklist = (data || []).map((row: Record<string, unknown>) => ({
    lineUserId: row.line_user_id,
    displayName: row.display_name || '',
    blockedAt: row.blocked_at,
    reason: row.reason || '',
  }))

  return { success: true, blacklist }
}

async function addToBlacklist(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  if (!data.lineUserId) {
    return { success: false, error: '缺少用戶 ID' }
  }

  // 檢查是否已存在
  const { data: existing } = await supabase
    .from('blacklist')
    .select('line_user_id')
    .eq('line_user_id', data.lineUserId)
    .single()

  if (existing) {
    return { success: false, error: '此用戶已在黑名單中' }
  }

  const { error } = await supabase
    .from('blacklist')
    .insert({
      line_user_id: data.lineUserId,
      display_name: data.displayName || '',
      blocked_at: new Date().toISOString(),
      reason: data.reason || '',
    })

  if (error) return { success: false, error: error.message }

  // 同步更新 Users 表
  await syncUserBlacklistStatus(data.lineUserId as string, 'BLACKLISTED')

  return { success: true, message: '已將用戶加入黑名單' }
}

async function removeFromBlacklist(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  if (!data.lineUserId) {
    return { success: false, error: '缺少用戶 ID' }
  }

  const { error } = await supabase
    .from('blacklist')
    .delete()
    .eq('line_user_id', data.lineUserId)

  if (error) return { success: false, error: error.message }

  await syncUserBlacklistStatus(data.lineUserId as string, 'ACTIVE')

  return { success: true, message: '已從黑名單移除用戶' }
}

async function isBlacklisted(lineUserId: string): Promise<boolean> {
  if (!lineUserId) return false

  const { data } = await supabase
    .from('blacklist')
    .select('line_user_id')
    .eq('line_user_id', lineUserId)
    .single()

  return !!data
}

async function getBlacklistInfo(lineUserId: string) {
  if (!lineUserId) return { isBlacklisted: false }

  const { data } = await supabase
    .from('blacklist')
    .select('*')
    .eq('line_user_id', lineUserId)
    .single()

  if (!data) return { isBlacklisted: false }

  return {
    isBlacklisted: true,
    displayName: data.display_name || '',
    blockedAt: data.blocked_at || '',
    reason: data.reason || '未提供原因',
  }
}

async function checkOrderInterval(lineUserId: string, intervalMinutes: number) {
  if (!lineUserId || intervalMinutes <= 0) {
    return { allowed: true, message: '' }
  }

  const { data } = await supabase
    .from('orders')
    .select('created_at')
    .eq('line_user_id', lineUserId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) {
    return { allowed: true, message: '' }
  }

  const orderTime = new Date(data[0].created_at)
  const now = new Date()
  const diffMinutes = (now.getTime() - orderTime.getTime()) / (1000 * 60)

  if (diffMinutes < intervalMinutes) {
    const remainingMinutes = Math.ceil(intervalMinutes - diffMinutes)
    return {
      allowed: false,
      message: `您已於 ${remainingMinutes} 分鐘前送出訂單，請稍後再試（間隔 ${intervalMinutes} 分鐘）`,
    }
  }

  return { allowed: true, message: '' }
}

// ============ LINE Bot 多帳號管理 ============

interface LineBot {
  id: string
  name: string
  token: string
  adminId: string
  usage: number
  limit: number
  active: boolean
}

async function getLineBotSettings(): Promise<{ success: boolean; bots: LineBot[]; error?: string }> {
  const settingsResult = await getSettings()
  const settings = settingsResult.settings || {}
  let botList: LineBot[] = []
  const configStr = settings.line_bot_config

  if (configStr && configStr.trim() !== '') {
    try {
      botList = JSON.parse(configStr)
      if (!Array.isArray(botList)) {
        botList = []
      }
    } catch {
      return { success: false, bots: [], error: '設定解析失敗' }
    }
  }

  // 只有在從未設定過時才初始化
  if (botList.length === 0 && (!configStr || configStr.trim() === '') && LINE_CHANNEL_ACCESS_TOKEN) {
    botList.push({
      id: crypto.randomUUID(),
      name: '預設帳號',
      token: LINE_CHANNEL_ACCESS_TOKEN,
      adminId: LINE_ADMIN_USER_ID,
      usage: 0,
      limit: 200,
      active: true,
    })

    try {
      await updateSettingsAction({
        userId: 'SYSTEM',
        settings: { line_bot_config: JSON.stringify(botList) },
      })
    } catch (e) {
      console.log('初始化 LINE Bot 設定失敗: ' + e)
    }
  }

  return { success: true, bots: botList }
}

async function saveLineBotSettings(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  return await updateSettingsAction({
    userId: data.userId,
    settings: { line_bot_config: JSON.stringify(data.bots) },
  })
}

async function switchLineBot(data: Record<string, unknown>) {
  if (!(await verifyAdmin(data.userId as string)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  const botSettings = await getLineBotSettings()
  let botList = botSettings.bots
  let found = false

  botList = botList.map((bot) => {
    if (bot.id === data.botId) {
      bot.active = true
      found = true
    } else {
      bot.active = false
    }
    return bot
  })

  if (!found) return { success: false, error: '找不到該帳號' }

  await updateSettingsAction({
    userId: data.userId as string,
    settings: { line_bot_config: JSON.stringify(botList) },
  })

  return { success: true, message: '已切換帳號' }
}

async function checkAndResetMonthlyUsage(botList: LineBot[]) {
  const now = new Date()
  const currentMonth = now.toISOString().substring(0, 7) // yyyy-MM
  const settingsResult = await getSettings()
  const lastResetMonth = settingsResult.settings?.last_reset_month || ''

  if (currentMonth !== lastResetMonth) {
    botList.forEach((bot) => bot.usage = 0)
    await updateSettingsAction({
      userId: 'SYSTEM',
      settings: {
        line_bot_config: JSON.stringify(botList),
        last_reset_month: currentMonth,
      },
    })
    return true
  }
  return false
}

async function getActiveLineBot(botList: LineBot[]): Promise<LineBot | null> {
  await checkAndResetMonthlyUsage(botList)

  let activeIndex = botList.findIndex((bot) => bot.active)
  if (activeIndex === -1 && botList.length > 0) {
    activeIndex = 0
    botList[0].active = true
  }
  if (activeIndex === -1) return null

  const currentBot = botList[activeIndex]

  if (currentBot.usage >= currentBot.limit) {
    for (let i = 1; i < botList.length; i++) {
      const nextIndex = (activeIndex + i) % botList.length
      const nextBot = botList[nextIndex]
      if (nextBot.usage < nextBot.limit) {
        botList.forEach((b) => b.active = false)
        nextBot.active = true
        await updateSettingsAction({
          userId: 'SYSTEM',
          settings: { line_bot_config: JSON.stringify(botList) },
        })
        return nextBot
      }
    }
    return currentBot
  }

  return currentBot
}

async function incrementBotUsage(botId: string) {
  const botSettings = await getLineBotSettings()
  const botList = botSettings.bots
  const bot = botList.find((b) => b.id === botId)
  if (bot) {
    bot.usage = (bot.usage || 0) + 1
    await updateSettingsAction({
      userId: 'SYSTEM',
      settings: { line_bot_config: JSON.stringify(botList) },
    })
  }
}

// ============ 用戶管理系統 ============

async function registerOrUpdateUser(userData: Record<string, string>) {
  const userId = userData.userId
  const now = new Date().toISOString()

  // 檢查是否已存在
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('line_user_id', userId)
    .single()

  if (existing) {
    // 更新
    const updateData: Record<string, unknown> = {
      display_name: userData.displayName,
      last_login: now,
    }

    if (userData.pictureUrl) {
      updateData.picture_url = userData.pictureUrl
    }

    if (userData.phone) {
      updateData.phone = userData.phone
    } else {
      userData.phone = existing.phone || ''
    }

    await supabase
      .from('users')
      .update(updateData)
      .eq('line_user_id', userId)

    return userData
  }

  // 新增用戶
  await supabase
    .from('users')
    .insert({
      line_user_id: userId,
      display_name: userData.displayName,
      picture_url: userData.pictureUrl || '',
      role: 'USER',
      status: 'ACTIVE',
      last_login: now,
      phone: userData.phone || '',
    })

  return userData
}

async function getUsers(data: { userId: string; search?: string }) {
  if (!(await verifyAdmin(data.userId)).isAdmin) {
    return { success: false, error: '權限不足' }
  }

  let query = supabase
    .from('users')
    .select('*')
    .order('last_login', { ascending: false })

  const search = (data.search || '').trim()
  if (search) {
    query = query.or(`display_name.ilike.%${search}%,line_user_id.ilike.%${search}%`)
  }

  const { data: users, error } = await query

  if (error) return { success: false, error: error.message }

  const result = (users || []).map((row: Record<string, unknown>) => ({
    userId: row.line_user_id,
    displayName: row.display_name,
    pictureUrl: row.picture_url,
    role: row.role,
    status: row.status,
    lastLogin: row.last_login,
  }))

  return { success: true, users: result }
}

async function updateUserRole(data: Record<string, unknown>) {
  if (data.userId !== LINE_ADMIN_USER_ID) {
    return { success: false, error: '只有超級管理員可以變更權限' }
  }

  const { error, count } = await supabase
    .from('users')
    .update({ role: data.newRole })
    .eq('line_user_id', data.targetUserId)

  if (error) return { success: false, error: error.message }
  if (!count) return { success: false, error: '找不到該用戶' }

  return { success: true, message: `權限已更新為 ${data.newRole}` }
}

async function syncUserBlacklistStatus(targetUserId: string, status: string) {
  await supabase
    .from('users')
    .update({ status })
    .eq('line_user_id', targetUserId)
}
