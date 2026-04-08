import {
  Brain,
  History,
  Home,
  MessageSquare,
  Mic,
  TestTube2,
  Upload,
  Video,
} from "lucide-react"

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

const userMenuItems: Item[] = [
  { icon: Home, title: "首页", path: "/user" },
  { icon: Brain, title: "心理状况分析", path: "/user/analysis" },
  { icon: TestTube2, title: "在线心理测试", path: "/user/psychological-test" },
  { icon: Mic, title: "在线音频录制", path: "/user/audio-recording" },
  { icon: Video, title: "在线视频录制", path: "/user/video-recording" },
  { icon: Upload, title: "文件上传分析", path: "/user/file-upload" },
  { icon: History, title: "历史分析记录", path: "/user/history" },
  { icon: MessageSquare, title: "心理医生咨询", path: "/user/counselor-chat" },
]

function UserSidebar() {
  const { user: currentUser } = useAuth()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={userMenuItems} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default UserSidebar