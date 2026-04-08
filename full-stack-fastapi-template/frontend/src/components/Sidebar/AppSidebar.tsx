import { Briefcase, Home, MessageSquare, Brain, History, Mic, Video, TestTube2, Users } from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "首页", path: "/" },
  { icon: Brain, title: "心理状况分析", path: "/analysis" },
  { icon: TestTube2, title: "在线心理测试", path: "/psychological-test" },
  { icon: Mic, title: "在线音频录制", path: "/audio-recording" },
  { icon: Video, title: "在线视频录制", path: "/video-recording" },
  { icon: History, title: "历史分析记录", path: "/history" },
  { icon: MessageSquare, title: "心理医生咨询", path: "/counselor-chat" },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  const items = currentUser?.is_superuser
    ? [...baseItems, { icon: Users, title: "用户管理", path: "/admin" }]
    : baseItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
