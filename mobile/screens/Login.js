import React, {useState} from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import axios from 'axios';

export default function Login({navigation}){
  const [email,setEmail]=useState(''), [password,setPassword]=useState('');
  const submit = async ()=> {
    try{
      const res = await axios.post('http://localhost:4000/api/auth/login', {email, password});
      // store token locally (AsyncStorage recommended) and navigate
      navigation.navigate('Dashboard');
    }catch(err){ alert(err.response?.data?.error || err.message) }
  }
  return (
    <View style={{padding:20}}>
      <Text>Email</Text>
      <TextInput value={email} onChangeText={setEmail} style={{borderWidth:1,padding:8,marginBottom:10}} />
      <Text>Password</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={{borderWidth:1,padding:8,marginBottom:10}} />
      <Button title='Login' onPress={submit} />
    </View>
  )
}
