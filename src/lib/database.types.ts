
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
                },"consignments": {
                  Row: {
                    "created_at": string,"created_by": string,"dealer_user_id": string,"device_id": string,"due_on": string,"floor_price": number,"handed_over_on": string,"handover_report_id": string,"id": string,"membership_id": string,"return_report_id": string | null,"shop_id": string,"status": Database["public"]['Enums']["consignment_status"]
                  }
                  Insert: {
                    "created_at"?: string,"created_by": string,"dealer_user_id": string,"device_id": string,"due_on": string,"floor_price": number,"handed_over_on"?: string,"handover_report_id": string,"id": string,"membership_id": string,"return_report_id"?: string | null,"shop_id": string,"status"?: Database["public"]['Enums']["consignment_status"]
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"dealer_user_id"?: string,"device_id"?: string,"due_on"?: string,"floor_price"?: number,"handed_over_on"?: string,"handover_report_id"?: string,"id"?: string,"membership_id"?: string,"return_report_id"?: string | null,"shop_id"?: string,"status"?: Database["public"]['Enums']["consignment_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "consignments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consignments_dealer_user_id_fkey"
      columns: ["dealer_user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consignments_device_id_fkey"
      columns: ["device_id"]
isOneToOne: false
      referencedRelation: "devices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consignments_handover_report_id_fkey"
      columns: ["handover_report_id"]
isOneToOne: true
      referencedRelation: "condition_reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consignments_membership_id_fkey"
      columns: ["membership_id"]
isOneToOne: false
      referencedRelation: "memberships"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consignments_return_report_id_fkey"
      columns: ["return_report_id"]
isOneToOne: true
      referencedRelation: "condition_reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consignments_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"name": string,"owner_user_id": string | null,"phone": string | null,"shop_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"name": string,"owner_user_id"?: string | null,"phone"?: string | null,"shop_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"name"?: string,"owner_user_id"?: string | null,"phone"?: string | null,"shop_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customers_owner_user_id_fkey"
      columns: ["owner_user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customers_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
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
                },"installments": {
                  Row: {
                    "amount": number,"created_at": string,"due_on": string,"id": string,"paid_on": string | null,"sale_id": string
                  }
                  Insert: {
                    "amount": number,"created_at"?: string,"due_on": string,"id": string,"paid_on"?: string | null,"sale_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"due_on"?: string,"id"?: string,"paid_on"?: string | null,"sale_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "installments_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sale_dues"
      referencedColumns: ["sale_id"]
    },{
      foreignKeyName: "installments_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
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
                },"sales": {
                  Row: {
                    "commission_rate_bps": number,"consignment_id": string | null,"created_at": string,"customer_id": string,"dealer_share": number | null,"decided_at": string | null,"decided_by": string | null,"device_id": string,"id": string,"purchase_price": number,"report_id": string,"sale_price": number,"seller_user_id": string,"shop_id": string | null,"shop_share": number | null,"status": Database["public"]['Enums']["sale_status"],"type": Database["public"]['Enums']["sale_type"],"warranty_days": number
                  }
                  Insert: {
                    "commission_rate_bps": number,"consignment_id"?: string | null,"created_at"?: string,"customer_id": string,"dealer_share"?: number | null,"decided_at"?: string | null,"decided_by"?: string | null,"device_id": string,"id": string,"purchase_price": number,"report_id": string,"sale_price": number,"seller_user_id": string,"shop_id"?: string | null,"shop_share"?: number | null,"status": Database["public"]['Enums']["sale_status"],"type": Database["public"]['Enums']["sale_type"],"warranty_days"?: number
                  }
                  Update: {
                    "commission_rate_bps"?: number,"consignment_id"?: string | null,"created_at"?: string,"customer_id"?: string,"dealer_share"?: number | null,"decided_at"?: string | null,"decided_by"?: string | null,"device_id"?: string,"id"?: string,"purchase_price"?: number,"report_id"?: string,"sale_price"?: number,"seller_user_id"?: string,"shop_id"?: string | null,"shop_share"?: number | null,"status"?: Database["public"]['Enums']["sale_status"],"type"?: Database["public"]['Enums']["sale_type"],"warranty_days"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sales_consignment_id_fkey"
      columns: ["consignment_id"]
isOneToOne: false
      referencedRelation: "consignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_device_id_fkey"
      columns: ["device_id"]
isOneToOne: false
      referencedRelation: "devices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_report_id_fkey"
      columns: ["report_id"]
isOneToOne: true
      referencedRelation: "condition_reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_seller_user_id_fkey"
      columns: ["seller_user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"settlement_allocations": {
                  Row: {
                    "amount": number,"sale_id": string,"settlement_id": string
                  }
                  Insert: {
                    "amount": number,"sale_id": string,"settlement_id": string
                  }
                  Update: {
                    "amount"?: number,"sale_id"?: string,"settlement_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "settlement_allocations_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sale_dues"
      referencedColumns: ["sale_id"]
    },{
      foreignKeyName: "settlement_allocations_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "settlement_allocations_settlement_id_fkey"
      columns: ["settlement_id"]
isOneToOne: false
      referencedRelation: "settlements"
      referencedColumns: ["id"]
    }
                  ]
                },"settlements": {
                  Row: {
                    "amount": number,"created_at": string,"dealer_user_id": string,"id": string,"membership_id": string,"method": Database["public"]['Enums']["payment_method"],"paid_at": string,"recorded_by": string,"shop_id": string
                  }
                  Insert: {
                    "amount": number,"created_at"?: string,"dealer_user_id": string,"id": string,"membership_id": string,"method": Database["public"]['Enums']["payment_method"],"paid_at"?: string,"recorded_by": string,"shop_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"dealer_user_id"?: string,"id"?: string,"membership_id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"paid_at"?: string,"recorded_by"?: string,"shop_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "settlements_dealer_user_id_fkey"
      columns: ["dealer_user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "settlements_membership_id_fkey"
      columns: ["membership_id"]
isOneToOne: false
      referencedRelation: "memberships"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "settlements_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "settlements_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
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
            "sale_dues": {
                  Row: {
                    "dealer_user_id": string | null,"device_id": string | null,"due": number | null,"membership_id": string | null,"sale_id": string | null,"settled": number | null,"shop_id": string | null,"shop_share": number | null,"sold_at": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "consignments_dealer_user_id_fkey"
      columns: ["dealer_user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consignments_membership_id_fkey"
      columns: ["membership_id"]
isOneToOne: false
      referencedRelation: "memberships"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_device_id_fkey"
      columns: ["device_id"]
isOneToOne: false
      referencedRelation: "devices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "add_member":
{ Args: { "p_commission_rate_bps"?: number,"p_email"?: string,"p_phone"?: string,"p_role": Database["public"]['Enums']["member_role"],"p_shop_id": string }; Returns: string
                           },
"create_consignment":
{ Args: { "p_consignment": Json,"p_photos": Json,"p_report": Json }; Returns: string
                           },
"create_intake_report":
{ Args: { "p_photos": Json,"p_report": Json }; Returns: string
                           },
"create_sale":
{ Args: { "p_photos": Json,"p_report": Json,"p_sale": Json }; Returns: Database["public"]['Enums']["sale_status"]
                           },
"create_shop":
{ Args: { "p_address"?: string,"p_name": string,"p_phone"?: string }; Returns: string
                           },
"dealer_balances":
{ Args: { "p_shop_id": string }; Returns: {
              "active": boolean,"balance": number,"dealer_name": string,"dealer_user_id": string,"membership_id": string,"total_owed": number,"total_settled": number
            }[]
                           },
"decide_sale":
{ Args: { "p_approve": boolean,"p_sale_id": string }; Returns: undefined
                           },
"delete_device":
{ Args: { "p_device_id": string }; Returns: undefined
                           },
"is_valid_imei":
{ Args: { "p_imei": string }; Returns: boolean
                           },
"preview_shares":
{ Args: { "p_purchase_price": number,"p_rate_bps": number,"p_sale_price": number }; Returns: {
              "dealer_share": number,"shop_share": number
            }[]
                           },
"record_settlement":
{ Args: { "p_settlement": Json }; Returns: string
                           },
"return_consignment":
{ Args: { "p_consignment_id": string,"p_photos": Json,"p_report": Json }; Returns: undefined
                           },
"set_device_withdrawn":
{ Args: { "p_device_id": string,"p_withdrawn": boolean }; Returns: undefined
                           },
"set_installment_paid":
{ Args: { "p_installment_id": string,"p_paid": boolean }; Returns: undefined
                           },
"set_installments":
{ Args: { "p_installments": Json,"p_sale_id": string }; Returns: undefined
                           },
"update_member":
{ Args: { "p_active": boolean,"p_commission_rate_bps": number,"p_membership_id": string,"p_role": Database["public"]['Enums']["member_role"] }; Returns: undefined
                           }
          }
          Enums: {
            "condition_grade": "NEW"|"LIKE_NEW"|"GOOD"|"FAIR","consignment_status": "ACTIVE"|"SOLD"|"RETURNED"|"SETTLED","device_status": "IN_STOCK"|"CONSIGNED"|"SOLD"|"WITHDRAWN","member_role": "OWNER"|"DEALER"|"CASHIER","payment_method": "CASH"|"MOBILE_MONEY"|"BANK_TRANSFER"|"OTHER","photo_angle": "FRONT"|"BACK"|"SIDES"|"SCREEN_ON"|"ABOUT"|"DEFECT","report_type": "INTAKE"|"HANDOVER"|"RETURN"|"SALE","sale_status": "PENDING_APPROVAL"|"COMPLETED"|"REJECTED"|"CANCELLED","sale_type": "SHOP"|"PERSONAL"
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
            "condition_grade": ["NEW", "LIKE_NEW", "GOOD", "FAIR"],"consignment_status": ["ACTIVE", "SOLD", "RETURNED", "SETTLED"],"device_status": ["IN_STOCK", "CONSIGNED", "SOLD", "WITHDRAWN"],"member_role": ["OWNER", "DEALER", "CASHIER"],"payment_method": ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"],"photo_angle": ["FRONT", "BACK", "SIDES", "SCREEN_ON", "ABOUT", "DEFECT"],"report_type": ["INTAKE", "HANDOVER", "RETURN", "SALE"],"sale_status": ["PENDING_APPROVAL", "COMPLETED", "REJECTED", "CANCELLED"],"sale_type": ["SHOP", "PERSONAL"]
          }
        }
} as const
