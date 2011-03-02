<import resource="classpath:alfresco/site-webscripts/org/alfresco/callutils.js">
/**
 * GET call to local web script
 */
function doLocalGetCall(theUrl, suppressError)
{
   var connector = remote.connect("http");
   var result = connector.get(url.server + url.serviceContext + theUrl);
   if ((result.status != status.STATUS_OK) && !suppressError)
   {
      status.setCode(status.STATUS_INTERNAL_SERVER_ERROR, "Error during remote call. " +
                     "Status: " + result.status + ", Response: " + result.response);
      return null;
   }
   return eval('(' + result.response + ')');
}
function main()
{
   var jsonObj = jsonUtils.toObject(requestbody.content), flickrUser = jsonObj.userId, userId = "", method, theUrl;
   
   if (flickrUser != "")
   {
      if ((/^\d+@[A-Z]\d\d$/).test(flickrUser)) // Normal userID
      {
         userId = flickrUser;
      }
      else if ((/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/).test(flickrUser)) // Test for email
      {
         method = "flickr.people.findByEmail";
         theUrl = "/modules/flickr/api?method=" + method + "&find_email=" + flickrUser;
      }
      else
      {
         method = "flickr.people.findByUsername";
         theUrl = "/modules/flickr/api?method=" + method + "&username=" + stringUtils.urlEncode(flickrUser);
      }
      if (theUrl != null)
      {
         var resp = doLocalGetCall(theUrl);
         if (resp.stat == "ok")
         {
            userId = resp.user.id;
         }
      }
   }
   
   var component = sitedata.getComponent(url.templateArgs.componentId);
   if (component != null)
   {
      var name;
      for (name in jsonObj)
      {
         if (name == "userId")
         {
            component.properties[name] = String(userId);
         }
         else
         {
            component.properties[name] = String(jsonObj[name]);
         }
      }
   
      component.save();
   }
   
   model.userId = userId;
}
main();