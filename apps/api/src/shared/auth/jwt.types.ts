// JWT payload structure
export interface JwtPayload {
  sub: string           // user_id
  org_id: string
  entity_type: string   // HOLDING | MARITIME | RAIL | ROAD | WAREHOUSE | AVIATION
  role: string
  permissions: string[]
  modules: string[]
  holding_id: string
  switched_from?: string // jika Holding switch ke entity context
  jti: string           // JWT ID untuk blacklist
  iat: number
  exp: number
}

export interface TokenPair {
  accessToken: string
  expiresIn: number     // seconds
}
