import { NextRequest, NextResponse } from "next/server";
import { connectToDatabases } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Collection } from "mongodb";
import { GameData } from "@/lib/types";
import IsBoosterByDCId from "@/lib/funcs/is-booster-by-dc-id";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, tag } = body;

    if (!gameId || !tag || typeof tag !== "string") {
      return NextResponse.json(
        { error: "gameId and tag are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll(cookiesToSet: any) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set({ name, value, ...options });
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set({ name, value, ...options });
            }
          },
        },
      }
    )
      .from("profiles_private")
      .select("discord_id")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const dcId = data.discord_id;
    if (!dcId) {
      return NextResponse.json("Discord ID not linked", { status: 400 });
    }

    const { pznAdmin } = await IsBoosterByDCId(dcId);

    if (!pznAdmin) {
      return NextResponse.json(
        { error: "User is not an admin" },
        { status: 403 }
      );
    }

    const { mainDb } = await connectToDatabases();

    const gamesColl = mainDb.collection("games") as Collection<GameData>;

    const game = await gamesColl.findOne({
      _id: new ObjectId(gameId as string),
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // categories is misspelled in the db as categories :) thanks petezah
    // smh it wasnt so i fixed

    const categories = game.categories ?? [];

    let updateQuery;
    if (!categories.includes(tag)) {
      updateQuery = { $addToSet: { categories: tag } };
    } else {
      return NextResponse.json(
        { error: "Tag already exists" },
        { status: 400 }
      );
    }

    await gamesColl.updateOne(
      { _id: new ObjectId(gameId as string) },
      updateQuery
    );

    const updated = await gamesColl.findOne(
      { _id: new ObjectId(gameId as string) },
      { projection: { categories: 1 } }
    );

    return NextResponse.json({ categories: updated?.categories ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: "internal_error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
