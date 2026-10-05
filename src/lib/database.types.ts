
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "condition_reports": {
                  Row: {
                    "accessories": (string)[],"battery_health": number | null,"body_condition": string,"cameras_ok": boolean,"charging_ok": boolean,"comment": string | null,"created_at": string,"created_by": string,"device_id": string,"face_id_ok": boolean,"grade": Database["public"]['Enums']["condition_grade"],"icloud_unlocked": boolean,"id": string,"past_repairs": (string)[],"screen_condition": string,"speakers_ok": boolean,"type": Database["public"]['Enums']["report_type"]
                  }
                  Insert: {
                    "accessories"?: (string)[],"battery_health"?: number | null,"body_condition": string,"cameras_ok": boolean,"charging_ok": boolean,"comment"?: string | null,"created_at"?: string,"created_by": string,"device_id": string,"face_id_ok": boolean,"grade": Database["public"]['Enums']["condition_grade"],"icloud_unlocked": boolean,"id": string,"past_repairs"?: (string)[],"screen_condition": string,"speakers_ok": boolean,"type": Database["public"]['Enums']["report_type"]
                  }
                  Update: {
                    "accessories"?: (string)[],"battery_health"?: number | null,"body_condition"?: string,"cameras_ok"?: boolean,"charging_ok"?: boolean,"comment"?: string | null,"created_at"?: string,"created_by"?: string,"device_id"?: string,"face_id_ok"?: boolean,"grade"?: Database["public"]['Enums']["condition_grade"],"icloud_unlocked"?: boolean,"id"?: string,"past_repairs"?: (string)[],"screen_condition"?: string,"speakers_ok"?: boolean,"type"?: Database["public"]['Enums']["report_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "condition_reports_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "condition_reports_device_id_fkey"
      columns: ["device_id"]
isOneToOne: false
      referencedRelation: "devices"
      referencedColumns: ["id"]
    }
                  ]
                },"devices": {
                  Row: {
                    "capacity": string,"color": string,"created_at": string,"created_by": string,"id": string,"imei": string,"model": string,"owner_user_id": string | null,"purchase_price": number,"shop_id": string | null,"status": Database["public"]['Enums']["device_status"],"target_price": number
                  }
                  Insert: {
                    "capacity": string,"color": string,"created_at"?: string,"created_by"?: string,"id"?: string,"imei": string,"model": string,"owner_user_id"?: string | null,"purchase_price": number,"shop_id"?: string | null,"status"?: Database["public"]['Enums']["device_status"],"target_price": number
                  }
                  Update: {
                    "capacity"?: string,"color"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"imei"?: string,"model"?: string,"owner_user_id"?: string | null,"purchase_price"?: number,"shop_id"?: string | null,"status"?: Database["public"]['Enums']["device_status"],"target_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "devices_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "devices_owner_user_id_fkey"
      columns: ["owner_user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "devices_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "commission_rate_bps": number,"created_at": string,"email": string | null,"id": string,"phone": string | null,"role": Database["public"]['Enums']["member_role"],"shop_id": string
                  }
                  Insert: {
                    "commission_rate_bps"?: number,"created_at"?: string,"email"?: string | null,"id"?: string,"phone"?: string | null,"role": Database["public"]['Enums']["member_role"],"shop_id": string
                  }
                  Update: {
                    "commission_rate_bps"?: number,"created_at"?: string,"email"?: string | null,"id"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"shop_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "active": boolean,"commission_rate_bps": number,"created_at": string,"id": string,"role": Database["public"]['Enums']["member_role"],"shop_id": string,"user_id": string
                  }
                  Insert: {
                    "active"?: boolean,"commission_rate_bps"?: number,"created_at"?: string,"id"?: string,"role": Database["public"]['Enums']["member_role"],"shop_id": string,"user_id": string
                  }
                  Update: {
                    "active"?: boolean,"commission_rate_bps"?: number,"created_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["member_role"],"shop_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"photos": {
                  Row: {
                    "angle": Database["public"]['Enums']["photo_angle"],"created_at": string,"id": string,"report_id": string,"storage_key": string,"taken_at": string
                  }
                  Insert: {
                    "angle": Database["public"]['Enums']["photo_angle"],"created_at"?: string,"id": string,"report_id": string,"storage_key": string,"taken_at": string
                  }
                  Update: {
                    "angle"?: Database["public"]['Enums']["photo_angle"],"created_at"?: string,"id"?: string,"report_id"?: string,"storage_key"?: string,"taken_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "photos_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "condition_reports"
      referencedColumns: ["id"]
    }
                  ]
                },"shops": {
                  Row: {
                    "address": string | null,"created_at": string,"currency": string,"id": string,"name": string,"phone": string | null
                  }
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"currency"?: string,"id"?: string,"name": string,"phone"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"currency"?: string,"id"?: string,"name"?: string,"phone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"users": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"name": string,"phone": string | null
                  }
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id": string,"name": string,"phone"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"phone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_member":
{ Args: { "p_commission_rate_bps"?: number,"p_email"?: string,"p_phone"?: string,"p_role": Database["public"]['Enums']["member_role"],"p_shop_id": string }; Returns: string
                           },
"create_intake_report":
{ Args: { "p_photos": Json,"p_report": Json }; Returns: string
                           },
"create_shop":
{ Args: { "p_address"?: string,"p_name": string,"p_phone"?: string }; Returns: string
                           },
"is_valid_imei":
{ Args: { "p_imei": string }; Returns: boolean
                           },
"set_device_withdrawn":
{ Args: { "p_device_id": string,"p_withdrawn": boolean }; Returns: undefined
                           },
"update_member":
{ Args: { "p_active": boolean,"p_commission_rate_bps": number,"p_membership_id": string,"p_role": Database["public"]['Enums']["member_role"] }; Returns: undefined
                           }
          }
          Enums: {
            "condition_grade": "NEW"|"LIKE_NEW"|"GOOD"|"FAIR","device_status": "IN_STOCK"|"CONSIGNED"|"SOLD"|"WITHDRAWN","member_role": "OWNER"|"DEALER"|"CASHIER","photo_angle": "FRONT"|"BACK"|"SIDES"|"SCREEN_ON"|"ABOUT"|"DEFECT","report_type": "INTAKE"|"HANDOVER"|"RETURN"|"SALE"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "condition_grade": ["NEW", "LIKE_NEW", "GOOD", "FAIR"],"device_status": ["IN_STOCK", "CONSIGNED", "SOLD", "WITHDRAWN"],"member_role": ["OWNER", "DEALER", "CASHIER"],"photo_angle": ["FRONT", "BACK", "SIDES", "SCREEN_ON", "ABOUT", "DEFECT"],"report_type": ["INTAKE", "HANDOVER", "RETURN", "SALE"]
          }
        }
} as const
