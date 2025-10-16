import { Color3 } from "@babylonjs/core"

export class UserInformation{
  displayName: string
  displayColor: Color3
  email: string

  constructor(displayName: string, displayColor: Color3, email: string){
    this.displayName = displayName
    this.displayColor = displayColor
    this.email = email
  }
}
