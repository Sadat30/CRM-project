import React, {useState} from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import axios from 'axios';

export default function Register({navigation}){
  const [full,setFull]=useState(''), [email,setEmail]=useState(''), [password,setPassword]=useState('');
  const submit = async ()=> {
    try{
      await axios.post('http://localhost:4000/api/auth/register', {full_name:full, username:email, email, password, phone:'', role:'customer'});
      alert('Registered');
      navigation.navigate('Login');
    }catch(err){ alert(err.response?.data?.error || err.message) }
  }
  return (
    <View style={{padding:20}}>
      <Text>Full name</Text>
      <TextInput value={full} onChangeText={setFull} style={{borderWidth:1,padding:8,marginBottom:10}} />
      <Text>Email</Text>
      <TextInput value={email} onChangeText={setEmail} style={{borderWidth:1,padding:8,marginBottom:10}} />
      <Text>Password</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={{borderWidth:1,padding:8,marginBottom:10}} />
      <Button title='Register' onPress={submit} />
    </View>
  )
}
