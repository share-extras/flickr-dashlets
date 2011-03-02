function main()
{
   var format = "json",
      method = args["method"] ? args["method"] : "",
      page = args["page"] ? parseInt(args["page"]) : 0,
      perPage = args["perPage"] ? parseInt(args["perPage"]) : 100;
   
   // Check method is not empty
   if (method === "")
   {
      status.setCode(status.STATUS_BAD_REQUEST, "No method was specified");
      status.redirect = true;
      return;
   }
   
   var s = new XML(config.script),
      endpoint = s.endpoint.toString(),
      apiKey = args["apiKey"] ? args["apiKey"] : s.apiKey.toString(),
      allowedMethod = s.allowedMethods.method.(@name == method);
   
   // Check allowedMethod is not null
   if (allowedMethod === null)
   {
      status.setCode(status.STATUS_BAD_REQUEST, "The method " + method + " is not allowed");
      status.redirect = true;
      return;
   }
   
   // Iterate through the allowed method args specified in the config
   var fArgs = "", arg, allowedArgs = allowedMethod.@args.toString().split(",");
   for (var i = 0; i < allowedArgs.length; i++)
   {
      arg = allowedArgs[i];
      if (args[arg])
      {
         fArgs += ("&" + arg + "=" + encodeParameterValue(args[arg]));
      }
   }
   
   var surl = endpoint + "?api_key=" + stringUtils.urlEncode(apiKey) + "&method=" + stringUtils.urlEncode(method) + fArgs + "&page=" + page + "&per_page=" + perPage + "&format=" + format + "&nojsoncallback=1"
      connector = remote.connect("http"),
      result = connector.get(surl);
   
   if (result.status == 200)
   {
      model.jsonResp = result.response;
   }
   else
   {
      model.status = result.status;
   }
}
function encodeParameterValue(val)
{
   return stringUtils.urlEncode(val).replace("%40", "@");
}

main();