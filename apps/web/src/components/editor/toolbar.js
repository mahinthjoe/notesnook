/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2022 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { useEffect, useMemo, useState } from "react";
import { Button, Flex, Text } from "@theme-ui/components";
import * as Icon from "../icons";
import { useStore as useAppStore } from "../../stores/app-store";
import { useStore as useThemeStore } from "../../stores/theme-store";
import { useStore as useMonographStore } from "../../stores/monograph-store";
import { useStore, store } from "../../stores/editor-store";
import { showToast } from "../../utils/toast";
import { AnimatedInput } from "../animated";
import { showPublishView } from "../publish-view";
import { db } from "../../common/db";
import { useEditorInstance, useHistory, useSearch } from "./context";

// TODO: this needs to be cleaned up!
function Toolbar() {
  const sessionId = useStore((store) => store.session.id);
  const isLocked = useStore((store) => store.session.locked);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isFocusMode = useAppStore((store) => store.isFocusMode);
  const toggleFocusMode = useAppStore((store) => store.toggleFocusMode);
  const setTitle = useStore((store) => store.setTitle);
  const toggleProperties = useStore((store) => store.toggleProperties);
  const clearSession = useStore((store) => store.clearSession);
  const title = useStore((store) => store.session.title);
  const theme = useThemeStore((store) => store.theme);
  const toggleNightMode = useThemeStore((store) => store.toggleNightMode);
  const [isTitleVisible, setIsTitleVisible] = useState(false);
  const monographs = useMonographStore((store) => store.monographs);
  const { canRedo, canUndo, redo, undo } = useHistory();
  const { toggleSearch } = useSearch();
  const editor = useEditorInstance();

  const isNotePublished = useMemo(
    () => sessionId && db.monographs.isPublished(sessionId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, monographs]
  );

  useEffect(() => {
    const editorScroll = document.querySelector(".editorScroll");
    if (!editorScroll) return;

    function onScroll(e) {
      const hideOffset = document.querySelector(".editorTitle").scrollHeight;
      if (e.target.scrollTop > hideOffset && !isTitleVisible)
        setIsTitleVisible(e.target.scrollTop > hideOffset && !isTitleVisible);
      else if (e.target.scrollTop <= hideOffset && isTitleVisible)
        setIsTitleVisible(false);
    }
    editorScroll.addEventListener("scroll", onScroll);
    return () => {
      editorScroll.removeEventListener("scroll", onScroll);
    };
  }, [isTitleVisible]);

  const tools = useMemo(
    () => [
      {
        title: isNotePublished ? "Published" : "Publish",
        icon: isNotePublished ? Icon.Published : Icon.Publish,
        hidden: !sessionId,
        enabled: !isLocked,
        onClick: () => showPublishView(store.get().session.id, "top")
      }
    ],
    [sessionId, isLocked, isNotePublished]
  );

  const inlineTools = useMemo(
    () => [
      {
        title: theme === "dark" ? "Light mode" : "Dark mode",
        icon: Icon.ThemeIcon,
        hidden: !isFocusMode,
        enabled: true,
        onClick: () => toggleNightMode()
      },
      {
        title: isFocusMode ? "Normal mode" : "Focus mode",
        icon: isFocusMode ? Icon.NormalMode : Icon.FocusMode,
        enabled: true,
        hideOnMobile: true,
        onClick: () => {
          toggleFocusMode();
          if (isFullscreen) {
            exitFullscreen(document);
            setIsFullscreen(false);
          }
          if (editor) editor.current.focus();
        }
      },
      {
        title: isFullscreen ? "Exit fullscreen" : "Enter fullscreen",
        icon: isFullscreen ? Icon.ExitFullscreen : Icon.Fullscreen,
        enabled: true,
        hidden: !isFocusMode,
        hideOnMobile: true,
        onClick: () => {
          if (isFullscreen) {
            exitFullscreen(document);
          } else {
            enterFullscreen(document.documentElement);
          }
          setIsFullscreen((s) => !s);
        }
      },
      {
        title: "Search",
        icon: Icon.Search,
        enabled: true,
        hidden: !sessionId,
        onClick: () => toggleSearch()
      },
      {
        title: "Undo",
        icon: Icon.Undo,
        enabled: canUndo,
        hidden: !sessionId,
        onClick: () => undo()
      },
      {
        title: "Redo",
        icon: Icon.Redo,
        enabled: canRedo,
        hidden: !sessionId,
        onClick: () => redo()
      },
      {
        title: "Properties",
        icon: Icon.Properties,
        enabled: true,
        hidden: !sessionId || isFocusMode,
        onClick: toggleProperties
      }
    ],
    [
      editor,
      undo,
      redo,
      isFullscreen,
      canRedo,
      canUndo,
      toggleFocusMode,
      toggleProperties,
      isFocusMode,
      theme,
      toggleNightMode,
      sessionId,
      toggleSearch
    ]
  );

  return (
    <Flex m={2} sx={{ justifyContent: "space-between" }}>
      <Flex sx={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Icon.ArrowLeft
          sx={{
            display: ["block", "none", "none"],
            flexShrink: 0
          }}
          size={24}
          onClick={() => {
            if (store.get().session.id) showToast("success", "Note saved!");
            if (isFocusMode) toggleFocusMode();
            clearSession();
          }}
        />
        <AnimatedInput
          variant="clean"
          ml={[2, 2, 0]}
          initial={{
            opacity: isTitleVisible ? 1 : 0,
            zIndex: isTitleVisible ? 1 : -1
          }}
          animate={{
            opacity: isTitleVisible ? 1 : 0,
            zIndex: isTitleVisible ? 1 : -1
          }}
          transition={{ duration: 0.5 }}
          fontWeight="heading"
          fontSize="heading"
          value={title}
          color="text"
          onChange={(e) => {
            const title = e.target.value;
            setTitle(sessionId, title);
          }}
          sx={{
            p: 0,
            borderWidth: 0,
            borderRadius: "default",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
            ":focus": { bg: "bgSecondary" }
          }}
        />
      </Flex>
      <Flex>
        {tools.map((tool) => (
          <Button
            data-test-id={tool.title}
            disabled={!tool.enabled}
            variant="tool"
            title={tool.title}
            key={tool.title}
            mr={1}
            sx={{
              display: [
                tool.hideOnMobile ? "none" : "flex",
                tool.hidden ? "none" : "flex"
              ],
              color: tool.enabled ? "text" : "disabled",
              cursor: tool.enabled ? "pointer" : "not-allowed",
              flexDirection: "row",
              flexShrink: 0,
              alignItems: "center"
            }}
            onClick={tool.onClick}
          >
            <tool.icon size={18} color={tool.enabled ? "text" : "disabled"} />
            <Text
              variant="body"
              ml={1}
              sx={{ display: ["none", "none", "block"] }}
            >
              {tool.title}
            </Text>
          </Button>
        ))}
        <Flex
          bg="bgSecondary"
          sx={{
            borderRadius: "default",
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "flex-end"
          }}
        >
          {inlineTools.map((tool) => (
            <Button
              data-test-id={tool.title}
              disabled={!tool.enabled}
              variant="tool"
              bg="transparent"
              title={tool.title}
              key={tool.title}
              sx={{
                borderRadius: 0,
                display: [
                  tool.hideOnMobile ? "none" : "flex",
                  tool.hidden ? "none" : "flex"
                ],
                color: tool.enabled ? "text" : "disabled",
                cursor: tool.enabled ? "pointer" : "not-allowed",
                flexDirection: "row",
                flexShrink: 0,
                alignItems: "center"
              }}
              onClick={tool.onClick}
            >
              <tool.icon size={18} color={tool.enabled ? "text" : "disabled"} />
              {tool.new && (
                <Text
                  variant="subBody"
                  ml={1}
                  bg="primary"
                  px={"3px"}
                  py="1px"
                  sx={{
                    borderRadius: "default",
                    fontSize: 10,
                    color: "static"
                  }}
                >
                  NEW
                </Text>
              )}
            </Button>
          ))}
        </Flex>
      </Flex>
    </Flex>
  );
}
export default Toolbar;

/* View in fullscreen */
function enterFullscreen(elem) {
  // go full-screen
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  } else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen();
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
  }
}

/* Close fullscreen */
function exitFullscreen(elem) {
  if (
    !document.fullscreenElement &&
    !document.webkitFullscreenElement &&
    !document.mozFullScreenElement
  )
    return;

  // exit full-screen
  if (elem.exitFullscreen) {
    elem.exitFullscreen();
  } else if (elem.webkitExitFullscreen) {
    elem.webkitExitFullscreen();
  } else if (elem.mozCancelFullScreen) {
    elem.mozCancelFullScreen();
  } else if (elem.msExitFullscreen) {
    elem.msExitFullscreen();
  }
}
