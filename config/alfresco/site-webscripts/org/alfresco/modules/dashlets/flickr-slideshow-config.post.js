<import resource="classpath:alfresco/site-webscripts/org/alfresco/callutils.js">
/**
 * GET call to local web script
 */
function doLocalGetCall(theUrl)
{
   var connector = remote.connect("http");
   var result = connector.get(url.server + url.serviceContext + theUrl);
   return result;
}
function main()
{
   var jsonObj = jsonUtils.toObject(requestbody.content), flickrUser = jsonObj.userId, userId = "", method, theUrl, result;
   
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
         result = doLocalGetCall(theUrl);
      }
      else if ((/^http:\/\/[\S]+$/).test(flickrUser)) // Test for URL
      {
         method = "flickr.urls.lookupUser";
         theUrl = "/modules/flickr/api?method=" + method + "&url=" + flickrUser;
         result = doLocalGetCall(theUrl);
      }
      else
      {
         method = "flickr.people.findByUsername";
         theUrl = "/modules/flickr/api?method=" + method + "&username=" + stringUtils.urlEncode(flickrUser);
         result = doLocalGetCall(theUrl);
         if ((result.status == status.STATUS_OK) && ((/^[\w\._-]+$/).test(flickrUser)))
         {
            var respJson = eval('(' + result.response + ')');
            if (respJson.stat != "ok")
            {
               // Try finding by URL name
               method = "flickr.urls.lookupUser";
               theUrl = "/modules/flickr/api?method=" + method + "&url="+ stringUtils.urlEncode("http://www.flickr.com/photos/" + flickrUser);
               result = doLocalGetCall(theUrl);
            }
         }
      }
      if (result != null)
      {
         if ((result.status != status.STATUS_OK))
         {
            status.setCode(status.STATUS_INTERNAL_SERVER_ERROR, "Error during remote call. " +
                           "Status: " + result.status + ", Response: " + result.response);
            status.redirect = true;
            return;
         }
         else
         {
            var respJson = eval('(' + result.response + ')');
            if (respJson.stat == "ok")
            {
               userId = respJson.user.id;
            }
            else
            {
               model.code = respJson.code;
               model.message = respJson.message;
               
               status.setCode(status.STATUS_INTERNAL_SERVER_ERROR, respJson.message);
               status.redirect = true;
               return;
            }
            model.stat = respJson.stat;
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