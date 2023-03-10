import React, { useContext } from "react";
import ChatContext from "../context/chat/ChatContext";
import MessageContext from "../context/messages/MessageContext";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useDisclosure,
  Popover,
  PopoverTrigger,
  PopoverContent,
  useToast,
} from "@chakra-ui/react";
const url = process.env.REACT_APP_URL;

function List(props) {
  const { Profile, groupMembers, setgroupMembers, socket } = props;
  const context = useContext(ChatContext);
  const contextMsg = useContext(MessageContext);
  const { encryptData } = contextMsg;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const {
    logUser,
    createNoty,
    groupMessages,
    setgroupMessages,
    recentChats,
    setrecentChats,
    accessChat,
  } = context;

  // To remove member from the group
  const removeFromGroup = async (User) => {
    onClose();
    try {
      let token = localStorage.getItem("token");
      const response = await fetch(
        `${url}/api/chat/removeUser?chatId=${Profile._id}&userId=${User._id}`,
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
      if (data.success) {
        setgroupMembers(
          groupMembers.filter((member) => {
            return member.user._id !== User._id;
          })
        );

        let message = "removed " + User.name;
        let encryptedMessage = encryptData(message);
        let noty = await createNoty(Profile._id, encryptedMessage);
        noty.removedUserId = User._id;
        socket.emit("new_message", noty);
        socket.emit("update_Chatlist", noty);
        let status = {
          users: [{ user: User._id }],
          chat: Profile,
          status: "remove",
        };
        socket.emit("member_status", status);
        let dataSend = { group: Profile, members: User, status: "remove" };
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
      }
    } catch (error) {
      toast({
        description: "Internal server error",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  //fetching single chat and neutralizing unseen message count
  const setSingleChat = async (User) => {
    let element = await accessChat(User._id);
    setrecentChats(
      recentChats.map((chat) => {
        if (chat._id === element._id) {
          chat.users = chat.users.map((members) => {
            if (members.user._id === logUser._id) {
              members.unseenMsg = 0;
              return members;
            } else {
              return members;
            }
          });
          return chat;
        } else {
          return chat;
        }
      })
    );
  };

  return (
    <div>
      <p
        onClick={onOpen}
        className="text-[rgb(36,141,97)] cursor-pointer font-semibold text-sm underline "
      >
        Show all
      </p>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent
          width={`${window.innerWidth < 768 ? "22rem" : "27rem"}`}
          top={`${window.innerWidth < 1536 ? "0" : "5"}`}
          borderRadius={"md"}
          bg=""
        >
          <div className="flex  px-6 bg-[rgb(36,36,36)] py-3 justify-between">
            <div className="flex  space-x-2">
              <img
                alt=""
                className="w-6 h-6"
                src={
                  "https://res.cloudinary.com/dynjwlpl3/image/upload/v1675095423/Chat-app/group_iu5tv2.png"
                }
              ></img>
              <p className="text-[rgb(167,169,171)] text-base font-semibold">
                MEMBER ({groupMembers.length})
              </p>
            </div>
            <i
              onClick={onClose}
              className="fa-solid cursor-pointer text-[rgb(167,169,171)] text-xl  fa-xmark"
            ></i>
          </div>
          {/* paddingBottom={'2'} */}
          <ModalBody
            padding={"0"}
            paddingLeft={"0"}
            paddingRight={"0"}
            minHeight={"20rem"}
            maxHeight={"26rem"}
            overflowX={"hidden"}
            overflowY={"scroll"}
            className={`${window.innerWidth > 768 && "styleScroll"}`}
            bg={"rgb(27,27,27)"}
          >
            <div className="text-[rgb(240,240,240)] ">
              <div
                onClick={() => {
                  logUser._id !== Profile.admin._id &&
                    setSingleChat(Profile.admin);
                }}
                className="flex  relative  cursor-pointer  hover:bg-[rgb(44,44,44)] px-8 
            py-[8px] space-x-2 items-center"
              >
                <img
                  alt=""
                  className="w-12 rounded-full h-12"
                  src={Profile.admin.avtar}
                ></img>
                <div className="flex">
                  <p className=" text-base font-semibold">
                    {logUser._id === Profile.admin._id
                      ? "You"
                      : Profile.admin.name}
                  </p>
                  <p
                    className="text-xs absolute right-4  py-[5px] font-bold px-2 rounded-md  text-white
            bg-[rgb(53,55,59)] "
                  >
                    Group Admin
                  </p>
                </div>
              </div>
              {groupMembers.map((members) => {
                return !members.isRemoved &&
                  members.user._id !== Profile.admin._id ? (
                  <div
                    key={members.user._id}
                    className="flex px-8 group py-[8px] hover:bg-[rgb(44,44,44)] cursor-pointer space-x-2 relative items-center"
                  >
                    <img
                      onClick={() => {
                        setSingleChat(members.user);
                      }}
                      alt=""
                      className="w-12 rounded-full h-12"
                      src={members.user.avtar}
                    ></img>
                    <p
                      onClick={() => {
                        setSingleChat(members.user);
                      }}
                      className=" text-sm font-semibold"
                    >
                      {logUser._id === members.user._id
                        ? "You"
                        : members.user.name}
                    </p>

                    {logUser._id === Profile.admin._id && (
                      <div className=" cursor-pointer group-hover:flex hidden right-14 absolute">
                        <Popover>
                          <PopoverTrigger>
                            <i className=" text-white fa-solid fa-ellipsis"></i>
                          </PopoverTrigger>
                          <PopoverContent
                            className="focus:outline-none"
                            bg={"rgb(49,49,49)"}
                            outline="none"
                            textAlign={"center"}
                            borderColor={"rgb(75,75,75)"}
                            width={"32"}
                          >
                            <p
                              className=" border-[rgb(75,75,75)] hover:bg-[rgb(58,58,58)]  border-b-[1px] py-1 "
                              onClick={() => {
                                removeFromGroup(members.user);
                              }}
                            >
                              Remove
                            </p>
                            <p
                              onClick={() => {
                                setSingleChat(members.user);
                              }}
                              className="hover:bg-[rgb(58,58,58)] py-1"
                            >
                              View profile
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                ) : (
                  <div key=""></div>
                );
              })}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default List;
