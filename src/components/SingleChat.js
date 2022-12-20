import React, { useEffect, useState } from 'react'
import { useContext } from 'react';


import ChatContext from '../context/user/ChatContext';
import io from "socket.io-client";
import { FormControl } from '@chakra-ui/react';
import ScrollableChat from './ScrollableChat';
import Loading from './Loading';
const ENDPOINT="http://localhost:4000";
var socket;
var selectedChatCompare;


export default function SingleChat(props) {
     const {toggleProfileView}=props;
       const [messages, setmessages] = useState([]);
       const [newMessage, setnewMessage] = useState("");
       const context = useContext(ChatContext);
       const [secondUser, setsecondUser] = useState({});
       const [loading, setloading] = useState(false);
      //  const [SocketConnected, setSocketConnected] = useState(false);
       const {logUser,chatroom,recentChats,setrecentChats}=context;


  // To estaiblish connection //

        useEffect(() => {
          const connectUser=()=>{
            toggleProfileView(false);
            if(chatroom.users){ 
              socket = io(ENDPOINT);
              socket.emit("setup",logUser);
              chatroom.users[0]._id===logUser._id?setsecondUser(chatroom.users[1]):setsecondUser(chatroom.users[0]);
            }
            
          }
          connectUser();
        },[chatroom,logUser])

  //To join room //

          useEffect(() => {
            setloading(true);
            const fetchMessage =async ()=>{
              if(!chatroom.users) return ;
              let token =localStorage.getItem('token');
              const response=await fetch(`http://localhost:7000/api/chat/fetchMessages?Id=${chatroom._id}`,
              {
                method:'GET',
                mode:"cors" ,
                headers: {
                  'Content-Type':'application/json',
                  'auth-token':token
                },
              }) 
                let data=await response.json();
                setmessages(data);
                setloading(false);
                socket.emit('join chat',chatroom._id);
              }
             fetchMessage();
             selectedChatCompare=chatroom;
          }, [chatroom])

    
  // To send message //
       const sendMessage =async (e)=>{
         if(e.key==="Enter" && newMessage){
               console.log(newMessage);
                let token =localStorage.getItem('token');
                const response=await fetch(`http://localhost:7000/api/chat/message`,
                  {
                    method:'POST',
                    mode:"cors" ,
                    headers: {
                      'Content-Type':'application/json',
                      'auth-token':token
                    },
                    body:JSON.stringify({content:newMessage,chatId:chatroom._id})
                  }) 

                  const data=await response.json();
                  socket.emit("new_message",data);
                  setmessages([...messages,data]);
                  let updatedChat;
                  let chats=recentChats;
                  chats=chats.filter((Chat)=>{
                       if(Chat._id===chatroom._id){
                         Chat.latestMessage=data;
                         updatedChat=Chat;
                        }
                      return Chat._id!==chatroom._id;
                  });
                  setnewMessage("");
                  setrecentChats([updatedChat,...chats]);
              }
              }
                  

  // To receive message //
 
        useEffect(() => {
          if(!socket) return ;
          socket.on('message_recieved',(message)=>{
                if(!selectedChatCompare||selectedChatCompare._id!==message.chatId._id){
                      //give notification
                }else{
                  setmessages([...messages,message]); 
                  console.log(messages.length);
                }
               
                console.log(message);

                let updatedChat;
                let chats=recentChats;
                chats=chats.filter((Chat)=>{
                       if(Chat._id===message.chatId._id){
                         Chat.latestMessage=message;
                         updatedChat=Chat;
                        }
                      return Chat._id!==message.chatId._id;
                 });
                setnewMessage("");
                setrecentChats([updatedChat,...chats]);


           })
        },[chatroom,messages,recentChats]); 

       
  return (
    <>
    
      <div className="bg-[rgb(27,27,27)]  text-white w-[70%]" >
        <div className='flex items-center border-[1px] border-[rgb(42,42,42)]  h-16 py-3 space-x-4 px-4 bg-[rgb(36,36,36)] '>
          <img onClick={()=>{props.toggleProfileView(true)}} alt='' className='w-10 h-10 cursor-pointer rounded-full' src={secondUser.avtar}></img>
          <p className='cursor-pointer' onClick={()=>{props.toggleProfileView(true)}}>{secondUser.name}</p>
        </div>
        <div className={`chatBox  py-2 px-4  h-[77vh]`}>
        {loading&&<Loading></Loading>}
           {!loading&&<ScrollableChat className="" messages={messages} user={logUser}/> }
        </div>
        <FormControl className='bg-[rgb(36,36,36)] border-[1px] border-[rgb(42,42,42)] relative flex justify-center items-center h-[4.9rem]' onKeyDown={sendMessage}>
            <input placeholder='Your messages...' className='bg-[rgb(53,55,59)] 
             border-black w-[86%] h-12 outline-none rounded-xl py-1 px-4' type="text"
              onChange={(e)=>{setnewMessage(e.target.value)}} value={newMessage} ></input>
              
              <i className="fa-solid absolute text-xl right-20 text-[rgb(36,141,97)] fa-paper-plane"></i>
        </FormControl>
      </div>
  </>
  )

}

