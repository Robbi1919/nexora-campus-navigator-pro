export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
public: {
  Tables: {
    buildings: {
      Row: {
        address: string | null
        description: string | null
        id: number
        name: string
      }
      Insert: {
        address?: string | null
        description?: string | null
        id?: number
        name: string
      }
      Update: {
        address?: string | null
        description?: string | null
        id?: number
        name?: string
      }
      Relationships: []
    }
    floors: {
      Row: {
        building_id: number
        floor_number: number
        id: number
        map_image_url: string | null
        name: string | null
      }
      Insert: {
        building_id: number
        floor_number: number
        id?: number
        map_image_url?: string | null
        name?: string | null
      }
      Update: {
        building_id?: number
        floor_number?: number
        id?: number
        map_image_url?: string | null
        name?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "floors_building_id_fkey"
          columns: ["building_id"]
          isOneToOne: false
          referencedRelation: "buildings"
          referencedColumns: ["id"]
        },
      ]
    }
    graph_edges: {
      Row: {
        created_at: string | null
        direction_hint: string | null
        distance_meters: number
        from_node_id: number
        id: number
        is_accessible: boolean
        is_bidirectional: boolean
        to_node_id: number
      }
      Insert: {
        created_at?: string | null
        direction_hint?: string | null
        distance_meters: number
        from_node_id: number
        id?: number
        is_accessible?: boolean
        is_bidirectional?: boolean
        to_node_id: number
      }
      Update: {
        created_at?: string | null
        direction_hint?: string | null
        distance_meters?: number
        from_node_id?: number
        id?: number
        is_accessible?: boolean
        is_bidirectional?: boolean
        to_node_id?: number
      }
      Relationships: [
        {
          foreignKeyName: "graph_edges_from_node_id_fkey"
          columns: ["from_node_id"]
          isOneToOne: false
          referencedRelation: "graph_nodes"
          referencedColumns: ["id"]
        },
        {
          foreignKeyName: "graph_edges_to_node_id_fkey"
          columns: ["to_node_id"]
          isOneToOne: false
          referencedRelation: "graph_nodes"
          referencedColumns: ["id"]
        },
      ]
    }
    graph_nodes: {
      Row: {
        building_id: number | null
        created_at: string | null
        floor_id: number | null
        id: number
        is_accessible: boolean
        label: string
        room_id: number | null
        type: string
        x_coord: number | null
        y_coord: number | null
      }
      Insert: {
        building_id?: number | null
        created_at?: string | null
        floor_id?: number | null
        id?: number
        is_accessible?: boolean
        label: string
        room_id?: number | null
        type: string
        x_coord?: number | null
        y_coord?: number | null
      }
      Update: {
        building_id?: number | null
        created_at?: string | null
        floor_id?: number | null
        id?: number
        is_accessible?: boolean
        label?: string
        room_id?: number | null
        type?: string
        x_coord?: number | null
        y_coord?: number | null
      }
      Relationships: [
        {
          foreignKeyName: "graph_nodes_building_id_fkey"
          columns: ["building_id"]
          isOneToOne: false
          referencedRelation: "buildings"
          referencedColumns: ["id"]
        },
        {
          foreignKeyName: "graph_nodes_floor_id_fkey"
          columns: ["floor_id"]
          isOneToOne: false
          referencedRelation: "floors"
          referencedColumns: ["id"]
        },
        {
          foreignKeyName: "graph_nodes_room_id_fkey"
          columns: ["room_id"]
          isOneToOne: false
          referencedRelation: "rooms"
          referencedColumns: ["id"]
        },
      ]
    }
    navigation_logs: {
      Row: {
        completed: boolean | null
        created_at: string
        duration_seconds: number | null
        from_room_id: number
        id: number
        is_accessible_route: boolean | null
        to_room_id: number
        user_id: string | null
      }
      Insert: {
        completed?: boolean | null
        created_at?: string
        duration_seconds?: number | null
        from_room_id: number
        id?: number
        is_accessible_route?: boolean | null
        to_room_id: number
        user_id?: string | null
      }
      Update: {
        completed?: boolean | null
        created_at?: string
        duration_seconds?: number | null
        from_room_id?: number
        id?: number
        is_accessible_route?: boolean | null
        to_room_id?: number
        user_id?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "navigation_logs_from_room_id_fkey"
          columns: ["from_room_id"]
          isOneToOne: false
          referencedRelation: "rooms"
          referencedColumns: ["id"]
        },
        {
          foreignKeyName: "navigation_logs_to_room_id_fkey"
          columns: ["to_room_id"]
          isOneToOne: false
          referencedRelation: "rooms"
          referencedColumns: ["id"]
        },
      ]
    }
    qr_locations: {
      Row: {
        floor_id: number
        id: number
        label: string | null
        qr_code_data: string
        room_id: number
      }
      Insert: {
        floor_id: number
        id?: number
        label?: string | null
        qr_code_data: string
        room_id: number
      }
      Update: {
        floor_id?: number
        id?: number
        label?: string | null
        qr_code_data?: string
        room_id?: number
      }
      Relationships: [
        {
          foreignKeyName: "qr_locations_floor_id_fkey"
          columns: ["floor_id"]
          isOneToOne: false
          referencedRelation: "floors"
          referencedColumns: ["id"]
        },
        {
          foreignKeyName: "qr_locations_room_id_fkey"
          columns: ["room_id"]
          isOneToOne: false
          referencedRelation: "rooms"
          referencedColumns: ["id"]
        },
      ]
    }
    reviews: {
      Row: {
        comment: string | null
        created_at: string
        id: number
        rating: number
        route_from: number
        route_to: number
        user_id: string | null
      }
      Insert: {
        comment?: string | null
        created_at?: string
        id?: number
        rating: number
        route_from: number
        route_to: number
        user_id?: string | null
      }
      Update: {
        comment?: string | null
        created_at?: string
        id?: number
        rating?: number
        route_from?: number
        route_to?: number
        user_id?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "reviews_route_from_fkey"
          columns: ["route_from"]
          isOneToOne: false
          referencedRelation: "rooms"
          referencedColumns: ["id"]
        },
        {
          foreignKeyName: "reviews_route_to_fkey"
          columns: ["route_to"]
          isOneToOne: false
          referencedRelation: "rooms"
          referencedColumns: ["id"]
        },
      ]
    }
    rooms: {
      Row: {
        description: string | null
        floor_id: number
        id: number
        is_accessible: boolean | null
        name: string
        type: Database["public"]["Enums"]["room_type"]
        x_coord: number | null
        y_coord: number | null
      }
      Insert: {
        description?: string | null
        floor_id: number
        id?: number
        is_accessible?: boolean | null
        name: string
        type: Database["public"]["Enums"]["room_type"]
        x_coord?: number | null
        y_coord?: number | null
      }
      Update: {
        description?: string | null
        floor_id?: number
        id?: number
        is_accessible?: boolean | null
        name?: string
        type?: Database["public"]["Enums"]["room_type"]
        x_coord?: number | null
        y_coord?: number | null
      }
      Relationships: [
        {
          foreignKeyName: "rooms_floor_id_fkey"
          columns: ["floor_id"]
          isOneToOne: false
          referencedRelation: "floors"
          referencedColumns: ["id"]
        },
      ]
    }
    user_favorites: {
      Row: {
        created_at: string
        custom_label: string | null
        id: number
        room_id: number
        user_id: string
      }
      Insert: {
        created_at?: string
        custom_label?: string | null
        id?: number
        room_id: number
        user_id: string
      }
      Update: {
        created_at?: string
        custom_label?: string | null
        id?: number
        room_id?: number
        user_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "user_favorites_room_id_fkey"
          columns: ["room_id"]
          isOneToOne: false
          referencedRelation: "rooms"
          referencedColumns: ["id"]
        },
      ]
    }
    user_recent: {
      Row: {
        id: number
        navigated_at: string
        room_id: number
        user_id: string
      }
      Insert: {
        id?: number
        navigated_at?: string
        room_id: number
        user_id: string
      }
      Update: {
        id?: number
        navigated_at?: string
        room_id?: number
        user_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "user_recent_room_id_fkey"
          columns: ["room_id"]
          isOneToOne: false
          referencedRelation: "rooms"
          referencedColumns: ["id"]
        },
      ]
    }
  }
  Views: {
    [_ in never]: never
  }
  Functions: {
    [_ in never]: never
  }
  Enums: {
    room_type:
      | "aula"
      | "ufficio"
      | "bagno"
      | "ascensore"
      | "uscita_sicurezza"
      | "passaggio_disabili"
  }
  CompositeTypes: {
    [_ in never]: never
  }
}


type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      room_type: [
        "aula",
        "ufficio",
        "bagno",
        "ascensore",
        "uscita_sicurezza",
        "passaggio_disabili",
      ],
    },
  },
} as const
