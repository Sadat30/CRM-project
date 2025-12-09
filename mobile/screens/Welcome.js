import React from 'react';
import { View, Text, Button } from 'react-native';

export default function Welcome({navigation}){
  return (
    <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
      <Text style={{fontSize:22,fontWeight:'bold',marginBottom:20}}>SimpleCRM Mobile</Text>
      <Button title='Login' onPress={()=>navigation.navigate('Login')} />
      <Button title='Register' onPress={()=>navigation.navigate('Register')} />
    </View>
  )
}
