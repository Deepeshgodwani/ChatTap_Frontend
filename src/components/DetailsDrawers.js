
import React, { useContext, useState, useEffect } from "react";
import ChatContext from "../context/chat/ChatContext";
import GroupMembers from "./GroupMembers";
import { Spinner } from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import MessageContext from "../context/messages/MessageContext";
import {
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    useDisclosure
  } from '@chakra-ui/react'


function DetailsDrawers(props) {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const btnRef = React.useRef()
    const { Profile, toggleProfileView, socket } = props;
    const context = useContext(ChatContext);
    const [loading, setloading] = useState(false);

    const {
      logUser,
      setgroupPic,
      createNoty,
      recentChats,
      setrecentChats,
      chatroom,
      setchatroom,
      groupPic,
      setgroupName,
      groupName,
      groupMembers,
      setgroupMembers,
      groupMessages,
      setgroupMessages,
      accessGroupChat,
    } = context;
    const [dropdown, setDropdown] = useState(false);
    const [isUserExist, setisUserExist] = useState(true);
    const [newChatName, setnewChatName] = useState("");
    const [enabled, setenabled] = useState(false);
    const toast = useToast();
    const [commonGroups, setcommonGroups] = useState([]);
    const contextMsg = useContext(MessageContext);
    const { encryptData } = contextMsg;


    useEffect(() => {
        onOpen();
        // eslint-disable-next-line
    }, [])



     // feching mutual groups of loguser and usetwo 
  const getCommonGroups = async () => {
    try {
      let token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:7000/api/chat/getCommonGroups?userId=${Profile._id}`,
        {
          method: "GET",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
            "auth-token": token,
          },
        }
      );
  
      let data = await response.json();
      setcommonGroups(data);
    } catch (error) {
      toast({
        description: "Internal server error",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }
    
  };

  //calling getCommongroups on page rendering  
  useEffect(() => {
    if (!Profile.isGroupChat) {
      getCommonGroups();
    }
    // eslint-disable-next-line
  }, []);


  //checking is user is exist in group when groupmembers are updating //
  useEffect(() => {
    checkUserExist();
  }, [groupMembers]);

   
  //To change group profile picture 
  const changeProfile = async (e) => {
    setloading(true);
    try {
      if (
        e.target.files[0] &&
        (e.target.files[0].type === "image/jpeg" ||
          e.target.files[0].type === "image/png")
      ) {
        const formData = new FormData();
        formData.append("file", e.target.files[0]);
        formData.append("upload_preset", "chat_app");
        formData.append("cloud_name", "dynjwlpl3");
        const response = await fetch(
          "https://api.cloudinary.com/v1_1/dynjwlpl3/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );
        let pic = await response.json();
        let picture = pic.url.toString();
        let token = localStorage.getItem("token");
        let data = await fetch(
          `http://localhost:7000/api/chat/changePic?isGroupChat=${
            Profile.isGroupChat ? true : false
          }&Id=${Profile.isGroupChat ? Profile._id : logUser._id}&pic=${picture}`,
          {
            method: "GET",
            mode: "cors",
            headers: {
              "Content-Type": "application/json",
              "auth-token": token,
            },
          }
        );
  
        let message = await data.json();
        if (message.success) {
          setloading(false);
          setgroupPic(picture);
          setchatroom({ ...chatroom, profilePic: picture });
          let message = "changed this group's icon";
          let encryptedMessage = encryptData(message);
          let noty = await createNoty(Profile._id, encryptedMessage);
          socket.emit("new_message", noty);
          socket.emit("update_Chatlist", noty);
          let updatedChat;
          let chats = recentChats;
          chats = chats.filter((Chat) => {
            if (Chat._id === noty.chatId._id) {
              Chat.latestMessage = noty;
              Chat.profilePic = picture;
              updatedChat = Chat;
            }
            return Chat._id !== noty.chatId._id;
          });
          setrecentChats([updatedChat, ...chats]);
          Profile.isGroupChat && setgroupPic(picture);
          let data = { chat: chatroom, picture: picture, logUser: logUser };
          socket.emit("changed_groupImage", data);
          toast({
            title: "Profile picture is changed successfully",
            status: "success",
            isClosable: true,
          });
        }
        e.target.value = null;
      }else{
        toast({
          description: "picture format should be jpeg or png",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        description: "Internal server error",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }
    setloading(false);
  };

  
  // To exit from group .
  const exitGroup = async () => {
    try { 
        let token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:7000/api/chat/removeUser?chatId=${Profile._id}&userId=${logUser._id}`,
          {
            method: "GET",
            mode: "cors",
            headers: {
              "Content-Type": "application/json",
              "auth-token": token,
            },
          }
        );

        let data = await response.json();
        if (!data.success) return;
        let message = "left";
        let encryptedMessage = encryptData(message);
        let noty = await createNoty(Profile._id, encryptedMessage);
        noty.removedUserId = logUser._id;
        socket.emit("new_message", noty);
        socket.emit("update_Chatlist", noty);
        let status = {
          users: [{ user: logUser._id }],
          chat: Profile,
          status: "remove",
        };
        socket.emit("member_status", status);
        let dataSend = { group: Profile, members: logUser, status: "remove" };
        socket.emit("change_users", dataSend);
        let updatedChat;
        let chats = recentChats;
        chats = chats.filter((Chat) => {
          if (Chat._id === noty.chatId._id) {
            Chat.latestMessage = noty;
            updatedChat = Chat;
          }
          return Chat._id !== noty.chatId._id;
        });
        setrecentChats([updatedChat, ...chats]);
        setgroupMessages([...groupMessages, noty]);
        setgroupMembers(
          groupMembers.filter((member) => {
            return member.user._id !== logUser._id;
          })
        );
        setisUserExist(false);
      } catch (error) {
        toast({
          description: "Internal server error",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
      }
  };

  
  // checking user exist in group or not 
  const checkUserExist = () => {
    let check = false;
    groupMembers.forEach((members) => {
      if (members.user._id === logUser._id) {
        check = true;
      }
    });
    setisUserExist(check);
  };


   
  const editName = () => {
    let input = document.getElementById("inputName");
    input.style.borderBottomColor = "rgb(66,203,165)";
    input.disabled = false;
    setenabled(true);
  };


  const changeName = async () => {
    if (newChatName === Profile.chatname) {
      toast({
        title: "Error",
        description: "it is already chatname",
        status: "warning",
        duration: 9000,
        isClosable: true,
      });
    } else {
      let token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:7000/api/chat/changeName`,
        {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
            "auth-token": token,
          },
          body: JSON.stringify({
            type: "group",
            Id: Profile._id,
            name: newChatName,
          }),
        }
      );

      let data = await response.json();
      let input = document.getElementById("inputName");
      input.value = "";
      setgroupName(newChatName);
      setchatroom({ ...chatroom, chatname: newChatName });
      let message = "changed the subject to " + newChatName;
      let encryptedMessage = encryptData(message);
      let noty = await createNoty(Profile._id, encryptedMessage);
      socket.emit("new_message", noty);
      socket.emit("update_Chatlist", noty);
      input.disabled = false;
      setenabled(true);
      let updatedChat;
      let chats = recentChats;
      chats = chats.filter((Chat) => {
        if (Chat._id === noty.chatId._id) {
          Chat.latestMessage = noty;
          Chat.chatname = newChatName;
          updatedChat = Chat;
        }
        return Chat._id !== noty.chatId._id;
      });
      setrecentChats([updatedChat, ...chats]);
      let send = { chat: chatroom, name: newChatName, logUser: logUser };
      setnewChatName("");
      socket.emit("changed_groupName", send);
      toast({
        title: "Group name changed successfully",
        status: "success",
        isClosable: true,
      });
    }
  };


  const toggleDropdown = () => {
    console.log("..");
    if (dropdown) {
      setDropdown(false);
    } else {
      setDropdown(true);
    }
  };


  const setGroupChat = (element) => {
    if (chatroom._id !== element._id) {
      accessGroupChat(element._id);

      setrecentChats(
        recentChats.map((chat) => {
          if (chat._id === element._id) {
            chat.users.map((members) => {
              if (members.user._id === logUser._id) {
                members.unseenMsg = 0;
              }
            });

            return chat;
          } else {
            return chat;
          }
        })
      );
    }
  };


    

  return (
    <Drawer
    isOpen={isOpen}
    placement='right'
    onClose={onClose}
    finalFocusRef={btnRef}
  >
    <DrawerOverlay />
    <DrawerContent display={"flex"} flexDirection={"column"} backgroundColor={"rgb(36,36,36)"}>
        <div className="text-[rgb(233,233,233)] pt-4  px-5 text-xl font-semibold flex justify-between ">
            <p>Details</p>
            <i
                onClick={onClose}
                className="cursor-pointer mt-1 fa-solid fa-xmark"
            ></i>
        </div>
        <div className="py-2 chatBox overflow-x-hidden overflow-y-scroll  ">
          <div className="flex space-y-2  mt-3  py-2 flex-col items-center">
            <div className="relative group rounded-full flex justify-center items-center ">
              <img
                alt=""
                className="w-44 cursor-pointer group rounded-full h-44"
                src={Profile.isGroupChat ? groupPic : Profile.avtar}
                // onClick={onOpen}
              ></img>
              {loading && (
                <Spinner
                  size="xl"
                  color="white"
                  thickness="3px"
                  className="absolute"
                />
              )}

              {/* <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent borderRadius={"20px"}>
                  <img
                    alt=""
                    className="h-[70vh] rounded-lg"
                    src={
                      Profile.isGroupChat ? Profile.profilePic : Profile.avtar
                    }
                  ></img>
                </ModalContent>
              </Modal> */}

              {Profile.isGroupChat && isUserExist && (
                <div
                  id="hoverImg"
                  onClick={toggleDropdown}
                  className="absolute  hidden text-white group-hover:flex text-center py-14 bg-black w-44 space-y-1 h-44 opacity-70 rounded-full 
            flex-col justify-center items-center"
                >
                  <i className="fa-solid text-lg fa-camera"></i>
                  <div className="  text-xs font-semibold ">
                    <p>UPLOAD</p>
                    <p>GROUP PHOTO</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col  items-center text-[rgb(233,233,233)]">
              {/* <p className="font-[calibri] text-xl "> */}
              {Profile.isGroupChat ? (
                <div className="relative group mt-1 mb-1">
                  <input
                    className={`bg-transparent ${
                      enabled ? "border-b-2" : "border-b-0 text-center"
                            } cursor-pointer text-[rgb(170,170,170)] px-3 font-semibold  
                    placeholder:text-[rgb(211,211,211)]  text-lg pb-2 
                    border-[rgb(34,134,92)] outline-none  w-60`}
                    type={"text"}
                    disabled
                    id="inputName"
                    placeholder={
                      groupName.length > 20
                        ? groupName.slice(0, 23) + ".."
                        : groupName
                    }
                    maxLength="30"
                    onChange={(e) => {
                      setnewChatName(e.target.value);
                    }}
                  ></input>
                  {!enabled && isUserExist && (
                    <i
                      onClick={editName}
                      className="absolute group-hover:opacity-100 opacity-0 cursor-pointer text-[rgb(87,87,87)]  right-0 fa-solid fa-pen"
                    ></i>
                  )}
                  {enabled && newChatName && (
                    <i
                      onClick={changeName}
                      className="absolute cursor-pointer text-[rgb(87,87,87)]  right-0 fa-solid fa-circle-check"
                    ></i>
                  )}
                </div>
              ) : (
                <div className="font-semibold text-lg mt-1 w-52 pb-2 text-center">
                  {Profile.name.length > 23
                    ? Profile.name.slice(0, 23) + ".."
                    : Profile.name}
                </div>
              )}
            </div>
          </div>
          <div className="bg-[rgb(27,27,27)]  w-80 h-3"></div>
          {!Profile.isGroupChat && (
            <div className="  py-3  text-white ">
              <p className="text-[rgb(167,169,171)] px-5 font-semibold">
                Groups in common
              </p>
              <div className="flex h-56  overflow-y-scroll  chatBox mt-3 flex-col ">
                {commonGroups.map((group) => {
                  return (
                    <div
                      className="flex cursor-pointer hover:bg-[rgb(44,44,44)] py-[6px] px-3 items-center space-x-2"
                      key={group._id}
                      onClick={(e) => {
                        setGroupChat(group);
                      }}
                    >
                      <img
                        className="w-11 rounded-full h-11  "
                        alt=""
                        src={group.profilePic}
                      ></img>
                      <div>
                        <p className="text-base">{group.chatname}</p>
                        <p className="text-[rgb(146,145,148)] text-xs">
                          {group.users.length} member
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {Profile.isGroupChat && (
            <GroupMembers Profile={Profile} socket={socket} />
          )}

          {Profile.isGroupChat &&
            isUserExist &&
            logUser._id !== Profile.admin._id && (
              <div
                className="bg-[rgb(27,27,27)] 
        my-3 w-80 h-3"
              ></div>
            )}
          {Profile.isGroupChat &&
            isUserExist &&
            Profile.admin._id !== logUser._id && (
              <div
                onClick={exitGroup}
                className="text-[rgb(227,92,109)] items-center px-6 text-base space-x-2 flex cursor-pointer"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                <p className="">Exit group</p>
              </div>
            )}
        </div>
    </DrawerContent>
  </Drawer>
  )
}

export default DetailsDrawers