import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@innoverse/database";
import validateCompanyEmail from "company-email-validator";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    let { role, businessEmail } = body;

    if (!["Student", "Startup"].includes(role)) {
      return NextResponse.json({ message: "Invalid role selected" }, { status: 400 });
    }

    let isVerified = false;

    if (role === "Startup") {
      if (!businessEmail) {
        businessEmail = "test@startup.com";
      } else {
        const isBusinessEmail = validateCompanyEmail.isCompanyEmail(businessEmail);
        if (!isBusinessEmail) {
          return NextResponse.json({ message: "Invalid Business Email Address" }, { status: 400 });
        }
        isVerified = true;
      }
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    user.role = role;
    user.isVerified = isVerified;
    if (role === "Startup") {
      user.businessEmail = businessEmail;
    }

    await user.save();

    const redirectPath = role === "Student" ? "/dashboard/student" : "/dashboard/startup";
    return NextResponse.json({ message: "Role selected successfully", redirectPath });

  } catch (error: any) {
    return NextResponse.json({ message: "Error selecting role", err: error.message }, { status: 500 });
  }
}
