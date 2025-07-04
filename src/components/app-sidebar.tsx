"use client";

import * as React from "react";
import {
  UsersRound,
  Compass,
  LayoutDashboard,
  GraduationCap,
  UserRoundCheck,
  ShoppingCart,
  TicketCheck,
  Award,
} from "lucide-react";

import { NavStudent } from "@/components/nav-student";
import { NavTeacher } from "@/components/nav-teacher";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarOption } from "./sidebar-option";
import { useTranslations } from "next-intl";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("common");

  const data = {
    teams: [
      {
        name: t("team_student"),
        logo: UserRoundCheck,
        plan: t("team_student_plan"),
      },
      {
        name: t("team_teacher"),
        logo: GraduationCap,
        plan: t("team_teacher_plan"),
      },
    ],
    navStudent: [
      {
        title: t("dashboard"),
        url: "/dashboard",
        icon: LayoutDashboard,
        isActive: true,
      },
      {
        title: t("my_courses"),
        url: "/my-courses",
        icon: Compass,
      },
      {
        title: t("shop"),
        url: "/courses",
        icon: ShoppingCart,
      },
      {
        title: "Certificates",
        url: "/certificates",
        icon: Award,
      },
    ],
    navTeacher: [
      {
        name: t("dashboard"),
        url: "/teacher/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: t("my_courses"),
        url: "/teacher/courses",
        icon: Compass,
      },
      {
        name: t("students"),
        url: "/teacher/students",
        icon: UsersRound,
      },
    ],
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavStudent items={data.navStudent} />
        <NavTeacher items={data.navTeacher} />
      </SidebarContent>
      <SidebarFooter>
        <div className="p-1">
          <SidebarOption />
        </div>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
